from datetime import date
from django.db import transaction
from .models import BloodInventory, InventoryBatch, BatchStatus

def calculate_safe_to_share(facility, blood_group, component_type) -> int:
    """
    Safe-to-Share = max(0, Inventory - Reserved - Safety Target)
    Only usable non-expired inventory is counted.
    """
    summary = BloodInventory.objects.filter(
        facility=facility,
        blood_group=blood_group,
        component_type=component_type
    ).first()

    target = summary.safety_stock_target if summary else 15

    usable_batches = InventoryBatch.objects.filter(
        facility=facility,
        blood_group=blood_group,
        component_type=component_type,
        status=BatchStatus.USABLE,
        expiry_date__gt=date.today()
    )

    total_avail = sum(b.available_quantity for b in usable_batches)
    if summary and total_avail == 0 and summary.available_units > 0:
        total_avail = max(0, summary.available_units - summary.reserved_units)

    return max(0, total_avail - target)

def allocate_fefo(facility, blood_group, component_type, quantity_needed: int) -> list:
    """
    Allocates units from InventoryBatch using FEFO (First-Expired-First-Out).
    Excludes expired, quarantined, or reserved batches.
    Returns a list of (batch_number, allocated_quantity) tuples.
    """
    usable_batches = InventoryBatch.objects.select_for_update().filter(
        facility=facility,
        blood_group=blood_group,
        component_type=component_type,
        status=BatchStatus.USABLE,
        expiry_date__gt=date.today()
    ).order_by('expiry_date', 'created_at')

    remaining = quantity_needed
    allocations = []

    for batch in usable_batches:
        if remaining <= 0:
            break
        avail = batch.available_quantity
        if avail <= 0:
            continue
        take = min(remaining, avail)
        batch.quantity -= take
        batch.save()
        allocations.append((batch.batch_number, take))
        remaining -= take

    return allocations
