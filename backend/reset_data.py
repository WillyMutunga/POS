import os
import sys

# Setup Django Environment
sys.path.append(os.getcwd())
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "pos_backend.settings")
import django
django.setup()

from store.models import (
    Sale, SaleItem, Shift, PurchaseOrder, PurchaseOrderItem, 
    ReturnRefund, CustomerDebtLedger, AuditLog, Product
)

def reset_system_data():
    print("WARNING: This will permanently delete all sales, shifts, and stock data.")
    confirm = input("Are you absolutely sure? Type 'YES' to confirm: ")
    
    if confirm != 'YES':
        print("Aborted.")
        return

    print("Deleting transactional data...")
    SaleItem.objects.all().delete()
    Sale.objects.all().delete()
    Shift.objects.all().delete()
    PurchaseOrderItem.objects.all().delete()
    PurchaseOrder.objects.all().delete()
    ReturnRefund.objects.all().delete()
    CustomerDebtLedger.objects.all().delete()
    AuditLog.objects.all().delete()

    print("Resetting all product stock quantities to ZERO...")
    Product.objects.all().update(stock=0)

    print("\nSUCCESS: System data has been completely reset!")

if __name__ == "__main__":
    reset_system_data()
