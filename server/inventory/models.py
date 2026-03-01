from django.conf import settings
from django.utils import timezone
from django.db import transaction, models

class Product(models.Model):
    UNIT_CHOICES = [
        ('KG', 'Kg'),
        ('G', 'g'),
        ('L', 'L'),
        ('ML', 'mL'),
        ('UN', 'Unit'),
    ]
    
    # user = tenant
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='products')
    
    name = models.CharField(max_length=255)
    description = models.CharField(max_length=500, blank=True, null=True)
    sku = models.CharField(max_length=100)
    default_unit = models.CharField(max_length=5, choices=UNIT_CHOICES, default='UN')
    price = models.DecimalField(max_digits=10, decimal_places=2) # Selling price per default unit
    category = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True) # soft delete flag

    def __str__(self):
        return f"{self.name} - {self.sku}"

    class Meta:
        unique_together = ['user', 'sku']

class Stock(models.Model):
    SOURCE_CHOICES = [
        ('MANUAL', 'Manual Entry'),
        ('PO', 'Purchase Order'),
        ('ADJUSTMENT', 'Inventory Adjustment'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='stock_entries')

    batch_number = models.CharField(max_length=100, blank=True, null=True)
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='batches')
    quantity = models.DecimalField(max_digits=10, decimal_places=3) # remaining quantity in stock
    expiration_date = models.DateField(blank=True, null=True) # null if not perishable

    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='MANUAL')
    purchase_order = models.ForeignKey('PurchaseOrder', on_delete=models.SET_NULL, null=True, blank=True, related_name='stock_entries')

    created_at = models.DateTimeField(auto_now_add=True) # when the stock entry was created (e.g., when the batch was received)

    def __str__(self):
        return f"{self.product.name} - Qtd: {self.quantity}"
    
    class Meta:
        ordering = ['expiration_date'] # prioritize batches that expire sooner

class Supplier(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='supplier')
    
    # Basic Information
    legal_name = models.CharField(max_length=255)
    dba_name = models.CharField(max_length=255, blank=True, null=True) # Doing Business As
    account_number = models.CharField(max_length=100, blank=True, null=True) # for their internal reference

    # Contact Information
    contact_name = models.CharField(max_length=255, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    
    # Financial and Compliance Information
    tax_id = models.CharField(max_length=100, blank=True, null=True) # EIN or SSN for US supplier
    w9_on_file = models.BooleanField(default=False) # indicates if a W-9 form is on file for US supplier (simplified compliance tracking)
    payment_term_days = models.IntegerField(default=30)
    
    # Address
    address_line1 = models.CharField(max_length=255, blank=True, null=True)
    address_line2 = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=2, blank=True, null=True)
    zip_code = models.CharField(max_length=10, blank=True, null=True)
    
    is_active = models.BooleanField(default=True) # soft delete flag
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.legal_name

# Sequence counter to Purchase Orders
class SequenceCounterPO(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    prefix = models.CharField(max_length=20) # Ex: 'PO-2602'
    last_number = models.IntegerField(default=0)

    class Meta:
        # Ensure that each user has a unique sequence counter for each prefix
        unique_together = ['user', 'prefix']

class PurchaseOrder(models.Model):
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),         # Day 1: Draft created, not yet submitted
        ('ORDER', 'Ordered'),       # Day 2: Order submitted to supplier
        ('RECEIVED', 'Received'),   # Day 3: Goods received and stock updated
        ('CANCELLED', 'Cancelled'), # Order cancelled before delivery (if applicable)
        ('RETURNED', 'Returned'),   # Order returned to supplier (if applicable)
    ]

    # To simplified without partial payment
    PAYMENT_STATUS_CHOICES = [
        ('UNPAID', 'Unpaid'),
        ('PAID', 'Paid'),
        ('REFUNDED', 'Refunded'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='purchase_orders')
    supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, related_name='purchase_orders', null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')

    order_number = models.CharField(max_length=100)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)

    # Timestamps to track the order lifecycle
    created_at = models.DateTimeField(auto_now_add=True)            # when the order is created (draft)
    order_at = models.DateTimeField(blank=True, null=True)          # when the order is submitted to supplier
    expected_delivery = models.DateTimeField(blank=True, null=True) # when the goods are expected to be delivered
    last_updated = models.DateTimeField(auto_now=True)              # when the order status is last updated

    # Finacial details
    invoice_number = models.CharField(max_length=100, blank=True, null=True) # for received orders
    payment_due_date = models.DateField(blank=True, null=True)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='UNPAID') 
    
    notes = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-order_at']
        unique_together = ['user', 'order_number'] # Ensure order numbers are unique per user

    def save(self, *args, **kwargs):
        # Auto-generate order number if not set, using format: PO-YYMM-XXXX
        if not self.order_number:
            prefix = timezone.now().strftime('%y%m') # prefix yyMM
            
            with transaction.atomic():
                counter = SequenceCounterPO.objects.select_for_update().filter(
                    user=self.user,
                    prefix=prefix
                ).order_by('-id').first()

                # First of the month
                if not counter:
                    counter = SequenceCounterPO.objects.create(
                        user=self.user, 
                        prefix=prefix, 
                        last_number=0
                    )

                # Increment the sequence number
                counter.last_number += 1
                counter.save()

                # Format the order number with leading zeros for the sequence part
                self.order_number = f'PO-{prefix}-{counter.last_number:04d}'
                
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Order #{self.pk} - {self.supplier}"

class PurchaseOrderItem(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='purchase_order_items')
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='purchase_order_items')
    quantity = models.DecimalField(max_digits=10, decimal_places=3)
    order_unit = models.CharField(max_length=5, choices=Product.UNIT_CHOICES, default='UN')
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.product.name} - Qtd: {self.quantity} {self.order_unit} @ {self.unit_price}"

# Those who buy from our client
class Customer(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='customers')
    
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)

    address_line1 = models.CharField(max_length=255, blank=True, null=True)
    address_line2 = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=2, blank=True, null=True)
    zip_code = models.CharField(max_length=10, blank=True, null=True)

    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True) # soft delete flag

    def __str__(self):
        return self.name

# Sequence counter to Sales Order
class SequenceCounterSO(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    prefix = models.CharField(max_length=20) # Ex: 'SO-2602'
    last_number = models.IntegerField(default=0)

    class Meta:
        # Ensure that each user has a unique sequence counter for each prefix
        unique_together = ['user', 'prefix']

class SalesOrder(models.Model):
    STATUS_CHOICES = [
        ('ORDER', 'Ordered'),
        ('DELIVERED', 'Delivered'),
        ('CANCELLED', 'Cancelled'), # Order cancelled before delivery (if applicable)
        ('RETURNED', 'Returned'),   # Order returned to owner (if applicable)
    ]

    PAYMENT_STATUS_CHOICES = [
        ('UNPAID', 'Unpaid'),
        ('PAID', 'Paid'),
        ('REFUNDED', 'Refunded'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sales_orders')
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name='sales_orders', null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ORDER')

    # Order details
    order_number = models.CharField(max_length=100)        
    total_amount = models.DecimalField(max_digits=10, decimal_places=2) # snapshot of total amount at the time of order creation

    # Timestamps to track the order lifecycle
    order_at = models.DateTimeField(auto_now_add=True)              # when the order is created
    expected_delivery = models.DateTimeField(blank=True, null=True) # when the goods are expected to be delivered
    last_updated = models.DateTimeField(auto_now=True)              # when the order status is last updated

    # Finacial details
    invoice_number = models.CharField(max_length=100, blank=True, null=True) # for received orders
    payment_due_date = models.DateField(blank=True, null=True)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='UNPAID') 
    
    notes = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-order_at']
        unique_together = ['user', 'order_number']
        db_table = 'inventory_salesorders'

    def save(self, *args, **kwargs):
        # Auto-generate order number if not set, using format: SO-YYMM-XXXX
        if not self.order_number:
            prefix = timezone.now().strftime('%y%m') # prefix yyMM
            
            with transaction.atomic():
                counter = SequenceCounterSO.objects.select_for_update().filter(
                    user=self.user,
                    prefix=prefix
                ).order_by('-id').first()

                # First of the month
                if not counter:
                    counter = SequenceCounterSO.objects.create(
                        user=self.user, 
                        prefix=prefix, 
                        last_number=0
                    )

                # Increment the sequence number
                counter.last_number += 1
                counter.save()

                # Format the order number with leading zeros for the sequence part
                self.order_number = f'SO-{prefix}-{counter.last_number:06d}'
                
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Sales Order #{self.pk} - {self.customer.name if self.customer else 'No Customer'}"

class SalesOrderItem(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sales_order_items')
    sales_order = models.ForeignKey(SalesOrder, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='sales_order_items')
    quantity = models.DecimalField(max_digits=10, decimal_places=3)
    order_unit = models.CharField(max_length=5, choices=Product.UNIT_CHOICES, default='UN')
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.product.name} - Qtd: {self.quantity} {self.order_unit} @ {self.unit_price}"
