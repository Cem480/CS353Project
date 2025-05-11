package divergent_change_test_cases;

import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * This class demonstrates the Divergent Change code smell by combining
 * e-commerce product management, CRM functionality, logistics handling,
 * and analytics tracking in a single class.
 */
public class DivergentChangeTest7 {
    // Product management related fields
    private Map<String, Map<String, Object>> products;
    private Map<String, List<String>> productCategories;
    private Map<String, Double> productPrices;
    private Map<String, Integer> productInventory;
    private List<String> productSuppliers;

    // CRM related fields
    private Map<String, Map<String, Object>> customers;
    private Map<String, List<String>> customerPurchases;
    private Map<String, Integer> customerLoyaltyPoints;
    private List<Map<String, Object>> customerFeedback;
    private Map<String, Date> customerLastContact;

    // Logistics related fields
    private List<Map<String, Object>> shipments;
    private Map<String, String> shipmentCarriers;
    private Map<String, String> warehouseLocations;
    private Map<String, List<String>> carrierRoutes;
    private List<Map<String, Object>> deliveryIssues;

    // Analytics related fields
    private Map<String, Integer> productViewCount;
    private Map<String, Integer> productPurchaseCount;
    private List<Map<String, Object>> searchQueries;
    private Map<String, Double> conversionRates;
    private ScheduledExecutorService analyticsScheduler;

    // Constructor
    public DivergentChangeTest7() {
        // Initialize product management
        this.products = new HashMap<>();
        this.productCategories = new HashMap<>();
        this.productPrices = new HashMap<>();
        this.productInventory = new HashMap<>();
        this.productSuppliers = new ArrayList<>();

        // Initialize CRM
        this.customers = new HashMap<>();
        this.customerPurchases = new HashMap<>();
        this.customerLoyaltyPoints = new HashMap<>();
        this.customerFeedback = new ArrayList<>();
        this.customerLastContact = new HashMap<>();

        // Initialize logistics
        this.shipments = new ArrayList<>();
        this.shipmentCarriers = new HashMap<>();
        this.warehouseLocations = new HashMap<>();
        this.carrierRoutes = new HashMap<>();
        this.deliveryIssues = new ArrayList<>();

        // Initialize analytics
        this.productViewCount = new HashMap<>();
        this.productPurchaseCount = new HashMap<>();
        this.searchQueries = new ArrayList<>();
        this.conversionRates = new HashMap<>();
        this.analyticsScheduler = Executors.newScheduledThreadPool(1);

        // Set up initial data
        setupInitialData();

        // Schedule analytics jobs
        scheduleAnalyticsJobs();
    }

    private void setupInitialData() {
        // Add sample products
        addProduct("P001", "Smartphone X", "Electronics", 699.99, 50, "TechSupplier");
        addProduct("P002", "Bluetooth Headphones", "Electronics", 129.99, 100, "AudioGear");
        addProduct("P003", "Cotton T-Shirt", "Clothing", 19.99, 200, "FashionWholesale");

        // Add sample customers
        addCustomer("C001", "John Doe", "john.doe@example.com", "123 Main St");
        addCustomer("C002", "Jane Smith", "jane.smith@example.com", "456 Oak Ave");

        // Set warehouse locations
        warehouseLocations.put("W001", "New York");
        warehouseLocations.put("W002", "Los Angeles");
        warehouseLocations.put("W003", "Chicago");

        // Set shipping carriers
        shipmentCarriers.put("FedEx", "fedex.com/tracking");
        shipmentCarriers.put("UPS", "ups.com/tracking");
        shipmentCarriers.put("USPS", "usps.com/tracking");
    }

    private void scheduleAnalyticsJobs() {
        // Schedule daily analytics processing
        analyticsScheduler.scheduleAtFixedRate(() -> {
            System.out.println("Running daily analytics processing...");
            processDailyAnalytics();
        }, 1, 24, TimeUnit.HOURS);

        // Schedule weekly report generation
        analyticsScheduler.scheduleAtFixedRate(() -> {
            System.out.println("Generating weekly analytics reports...");
            generateWeeklyReports();
        }, 7, 7, TimeUnit.DAYS);
    }

    // Product management related methods
    public void addProduct(String productId, String name, String category,
            double price, int stock, String supplier) {
        Map<String, Object> product = new HashMap<>();
        product.put("id", productId);
        product.put("name", name);
        product.put("addedDate", new Date());

        products.put(productId, product);

        if (!productCategories.containsKey(category)) {
            productCategories.put(category, new ArrayList<>());
        }
        productCategories.get(category).add(productId);

        productPrices.put(productId, price);
        productInventory.put(productId, stock);

        if (!productSuppliers.contains(supplier)) {
            productSuppliers.add(supplier);
        }

        // Initialize analytics counters for new product
        productViewCount.put(productId, 0);
        productPurchaseCount.put(productId, 0);

        System.out.println("Product added: " + name + " (ID: " + productId + ")");
        System.out.println("Category: " + category);
        System.out.println("Price: $" + price);
        System.out.println("Initial Stock: " + stock);

        // Notify customers about new product - mixed responsibility
        notifyCustomersAboutNewProduct(productId, category);
    }

    public void updateProductPrice(String productId, double newPrice) {
        if (productPrices.containsKey(productId)) {
            double oldPrice = productPrices.get(productId);
            productPrices.put(productId, newPrice);

            String productName = (String) products.get(productId).get("name");
            System.out.println("Price updated for " + productName);
            System.out.println("Old price: $" + oldPrice);
            System.out.println("New price: $" + newPrice);

            // Record price change in analytics - mixed responsibility
            recordPriceChange(productId, oldPrice, newPrice);

            // Notify customers about price change - mixed responsibility
            if (newPrice < oldPrice) {
                notifyCustomersAboutPriceReduction(productId, oldPrice, newPrice);
            }
        } else {
            System.out.println("Product not found: " + productId);
        }
    }

    public void updateStock(String productId, int quantity) {
        if (productInventory.containsKey(productId)) {
            int currentStock = productInventory.get(productId);
            productInventory.put(productId, quantity);

            String productName = (String) products.get(productId).get("name");
            System.out.println("Stock updated for " + productName);
            System.out.println("Previous stock: " + currentStock);
            System.out.println("New stock: " + quantity);

            // Create shipment request if stock is low - mixed responsibility
            if (quantity < 10) {
                createRestockShipment(productId);
            }
        } else {
            System.out.println("Product not found: " + productId);
        }
    }

    // CRM related methods
    public void addCustomer(String customerId, String name, String email, String address) {
        Map<String, Object> customer = new HashMap<>();
        customer.put("id", customerId);
        customer.put("name", name);
        customer.put("email", email);
        customer.put("address", address);
        customer.put("registrationDate", new Date());

        customers.put(customerId, customer);
        customerPurchases.put(customerId, new ArrayList<>());
        customerLoyaltyPoints.put(customerId, 0);
        customerLastContact.put(customerId, new Date());

        System.out.println("Customer added: " + name + " (ID: " + customerId + ")");

        // Send welcome email - mixed responsibility
        sendCustomerEmail(customerId, "Welcome to our store!",
                "Thank you for registering with us. Enjoy your shopping!");
    }

    public void recordPurchase(String customerId, String productId) {
        if (!customers.containsKey(customerId)) {
            System.out.println("Customer not found: " + customerId);
            return;
        }

        if (!products.containsKey(productId)) {
            System.out.println("Product not found: " + productId);
            return;
        }

        // Update customer purchase history
        List<String> purchases = customerPurchases.get(customerId);
        purchases.add(productId);

        // Update customer loyalty points
        int currentPoints = customerLoyaltyPoints.get(customerId);
        double productPrice = productPrices.get(productId);
        int pointsToAdd = (int) (productPrice / 10); // 1 point for every $10 spent
        customerLoyaltyPoints.put(customerId, currentPoints + pointsToAdd);

        // Update inventory - mixed responsibility
        int currentStock = productInventory.get(productId);
        productInventory.put(productId, currentStock - 1);

        // Update analytics - mixed responsibility
        int purchaseCount = productPurchaseCount.get(productId);
        productPurchaseCount.put(productId, purchaseCount + 1);

        // Update last contact date
        customerLastContact.put(customerId, new Date());

        // Create shipment - mixed responsibility
        createCustomerShipment(customerId, productId);

        String customerName = (String) customers.get(customerId).get("name");
        String productName = (String) products.get(productId).get("name");

        System.out.println("Purchase recorded: " + customerName + " bought " + productName);
        System.out.println("Loyalty points added: " + pointsToAdd);
        System.out.println("New loyalty points balance: " + (currentPoints + pointsToAdd));
    }

    public void recordCustomerFeedback(String customerId, int rating, String comment) {
        if (!customers.containsKey(customerId)) {
            System.out.println("Customer not found: " + customerId);
            return;
        }

        Map<String, Object> feedback = new HashMap<>();
        feedback.put("customerId", customerId);
        feedback.put("rating", rating);
        feedback.put("comment", comment);
        feedback.put("date", new Date());

        customerFeedback.add(feedback);

        // Update last contact date
        customerLastContact.put(customerId, new Date());

        String customerName = (String) customers.get(customerId).get("name");
        System.out.println("Feedback recorded from " + customerName + ": " + rating + "/5");

        // Process feedback - mixed responsibility
        if (rating <= 2) {
            // Alert customer service
            System.out.println("ALERT: Low customer rating received. Customer service notified.");

            // Send follow-up email
            sendCustomerEmail(customerId, "We value your feedback",
                    "We're sorry to hear about your experience. A customer service representative will contact you shortly.");
        }
    }

    private void sendCustomerEmail(String customerId, String subject, String body) {
        if (!customers.containsKey(customerId)) {
            System.out.println("Customer not found: " + customerId);
            return;
        }

        Map<String, Object> customer = customers.get(customerId);
        String customerEmail = (String) customer.get("email");

        System.out.println("Sending email to: " + customerEmail);
        System.out.println("Subject: " + subject);
        System.out.println("Body: " + body);

        // Update last contact date
        customerLastContact.put(customerId, new Date());
    }

    // Logistics related methods
    public void createCustomerShipment(String customerId, String productId) {
        if (!customers.containsKey(customerId)) {
            System.out.println("Customer not found: " + customerId);
            return;
        }

        if (!products.containsKey(productId)) {
            System.out.println("Product not found: " + productId);
            return;
        }

        Map<String, Object> customer = customers.get(customerId);
        String customerAddress = (String) customer.get("address");

        Map<String, Object> shipment = new HashMap<>();
        shipment.put("id", "S" + System.currentTimeMillis());
        shipment.put("customerId", customerId);
        shipment.put("productId", productId);
        shipment.put("address", customerAddress);
        shipment.put("status", "Processing");
        shipment.put("creationDate", new Date());

        // Select carrier (simplified)
        String carrier = "FedEx";
        shipment.put("carrier", carrier);

        // Select warehouse (simplified)
        String warehouse = findClosestWarehouse(customerAddress);
        shipment.put("warehouse", warehouse);

        shipments.add(shipment);

        String productName = (String) products.get(productId).get("name");
        System.out.println("Shipment created for " + productName);
        System.out.println("Shipping to: " + customerAddress);
        System.out.println("Carrier: " + carrier);
        System.out.println("Warehouse: " + warehouse);

        // Notify customer about shipment - mixed responsibility
        sendCustomerEmail(customerId, "Your order has been processed",
                "Your order for " + productName + " is being prepared for shipment.");
    }

    private void createRestockShipment(String productId) {
        if (!products.containsKey(productId)) {
            System.out.println("Product not found: " + productId);
            return;
        }

        Map<String, Object> shipment = new HashMap<>();
        shipment.put("id", "RS" + System.currentTimeMillis());
        shipment.put("productId", productId);
        shipment.put("type", "Restock");
        shipment.put("status", "Ordered");
        shipment.put("creationDate", new Date());

        shipments.add(shipment);

        String productName = (String) products.get(productId).get("name");
        System.out.println("Restock shipment created for " + productName);
    }

    private String findClosestWarehouse(String customerAddress) {
        // Simplified warehouse selection - in real application would use geolocation
        return "W001"; // Default to New York warehouse
    }

    public void updateShipmentStatus(String shipmentId, String newStatus) {
        for (Map<String, Object> shipment : shipments) {
            if (shipment.get("id").equals(shipmentId)) {
                String oldStatus = (String) shipment.get("status");
                shipment.put("status", newStatus);
                shipment.put("lastUpdated", new Date());

                System.out.println("Shipment " + shipmentId + " status updated");
                System.out.println("Old status: " + oldStatus);
                System.out.println("New status: " + newStatus);

                // Notify customer about status change - mixed responsibility
                if (shipment.containsKey("customerId")) {
                    String customerId = (String) shipment.get("customerId");
                    String productId = (String) shipment.get("productId");
                    String productName = (String) products.get(productId).get("name");

                    if (newStatus.equals("Shipped")) {
                        sendCustomerEmail(customerId, "Your order has been shipped",
                                "Your order for " + productName + " has been shipped.");
                    } else if (newStatus.equals("Delivered")) {
                        sendCustomerEmail(customerId, "Your order has been delivered",
                                "Your order for " + productName + " has been delivered.");
                        // Request feedback - mixed responsibility
                        sendCustomerEmail(customerId, "How was your purchase?",
                                "We'd love to hear your feedback about " + productName);
                    }
                }

                // Record delivery issue if there's a problem - mixed responsibility
                if (newStatus.equals("Delayed") || newStatus.equals("Lost")) {
                    Map<String, Object> issue = new HashMap<>();
                    issue.put("shipmentId", shipmentId);
                    issue.put("status", newStatus);
                    issue.put("date", new Date());

                    deliveryIssues.add(issue);
                    System.out.println("Delivery issue recorded for shipment " + shipmentId);
                }

                return;
            }
        }

        System.out.println("Shipment not found: " + shipmentId);
    }

    // Analytics related methods
    public void recordProductView(String productId) {
        if (!productViewCount.containsKey(productId)) {
            productViewCount.put(productId, 0);
        }

        int currentViews = productViewCount.get(productId);
        productViewCount.put(productId, currentViews + 1);

        // Update conversion rate - mixed responsibility
        updateConversionRate(productId);
    }

    public void recordSearchQuery(String query, List<String> resultProductIds) {
        Map<String, Object> searchData = new HashMap<>();
        searchData.put("query", query);
        searchData.put("resultCount", resultProductIds.size());
        searchData.put("results", resultProductIds);
        searchData.put("timestamp", new Date());

        searchQueries.add(searchData);

        System.out.println("Search query recorded: " + query);
        System.out.println("Result count: " + resultProductIds.size());
    }

    private void updateConversionRate(String productId) {
        if (!productViewCount.containsKey(productId) || !productPurchaseCount.containsKey(productId)) {
            return;
        }

        int views = productViewCount.get(productId);
        int purchases = productPurchaseCount.get(productId);

        if (views > 0) {
            double conversionRate = (double) purchases / views;
            conversionRates.put(productId, conversionRate);
        }
    }

    private void processDailyAnalytics() {
        System.out.println("Processing daily analytics...");

        // Calculate conversion rates for all products
        for (String productId : products.keySet()) {
            updateConversionRate(productId);
        }

        // Identify top performing products
        System.out.println("Top performing products by conversion rate:");
        // Implementation simplified
    }

    private void generateWeeklyReports() {
        System.out.println("Generating weekly analytics reports...");

        // Product performance report
        System.out.println("Product Performance Report:");
        for (String productId : products.keySet()) {
            String productName = (String) products.get(productId).get("name");
            int views = productViewCount.getOrDefault(productId, 0);
            int purchases = productPurchaseCount.getOrDefault(productId, 0);
            double conversionRate = conversionRates.getOrDefault(productId, 0.0);

            System.out.println(productName + ":");
            System.out.println("  Views: " + views);
            System.out.println("  Purchases: " + purchases);
            System.out.println("  Conversion Rate: " + (conversionRate * 100) + "%");
        }

        // Customer engagement report
        System.out.println("\nCustomer Engagement Report:");
        // Implementation simplified

        // Logistics performance report
        System.out.println("\nLogistics Performance Report:");
        // Implementation simplified
    }

    // Mixed responsibility methods
    private void notifyCustomersAboutNewProduct(String productId, String category) {
        String productName = (String) products.get(productId).get("name");
        double productPrice = productPrices.get(productId);

        System.out.println("Notifying customers about new product: " + productName);

        // Find customers who purchased products in the same category
        for (Map.Entry<String, List<String>> entry : customerPurchases.entrySet()) {
            String customerId = entry.getKey();
            List<String> purchases = entry.getValue();

            boolean interestedInCategory = false;
            for (String purchasedProductId : purchases) {
                for (Map.Entry<String, List<String>> categoryEntry : productCategories.entrySet()) {
                    if (categoryEntry.getValue().contains(purchasedProductId)
                            && categoryEntry.getKey().equals(category)) {
                        interestedInCategory = true;
                        break;
                    }
                }

                if (interestedInCategory) {
                    break;
                }
            }

            if (interestedInCategory) {
                sendCustomerEmail(customerId, "New product you might like: " + productName,
                        "Check out our new product: " + productName + " for $" + productPrice);
            }
        }
    }

    private void notifyCustomersAboutPriceReduction(String productId, double oldPrice, double newPrice) {
        String productName = (String) products.get(productId).get("name");

        System.out.println("Notifying customers about price reduction for: " + productName);

        // Find customers who viewed but didn't purchase this product
        // This would typically use browsing history data
        // Simplified implementation
    }

    private void recordPriceChange(String productId, double oldPrice, double newPrice) {
        // Record for analytics purposes
        System.out.println("Price change recorded for analytics");

        // Here we would store price change history
        // Simplified implementation
    }

    // Clean-up method
    public void shutdown() {
        System.out.println("Shutting down...");
        analyticsScheduler.shutdown();
    }
}