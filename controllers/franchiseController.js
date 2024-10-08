const Franchise = require('../models/franchise'); 
const Product = require('../models/products');
const Inventory = require('../models/inventory');
const User = require('../models/users');
const { generateToken } = require('../middlewares/jwt');



// 1. Create new Franchise - only by admin
const handleCreateFranchise = async (req, res) => {
    try {
        const { franchiseName, email, password, contactInfo } = req.body;

        // Check if the franchise email already exists
        const existingFranchise = await Franchise.findOne({ email });
        if (existingFranchise) {
          return res.status(400).json({ message: 'Franchise already exists with this email.' });
        }
  
        // Check if the franchise contactInfo already exists
        const contactNumber = await Franchise.findOne({ contactInfo });
        if (contactNumber) {
          return res.status(400).json({ message: 'Franchise already exists with this contact Number.' });
        }
    
        // Create a new franchise
        const newFranchise = await Franchise.create({
            franchiseName,
            email,
            password: password, // Store hashed password
            contactInfo,
        });
    
        return res.status(201).json( {message: 'Franchise created successfully', franchiseId: newFranchise.franchiseId} );
    } catch (error) {
      console.error('Error creating franchise:', error);
      return res.status(500).json({ message: 'Server error', error: error.message });
    }
}




// 2. Get all Franchises - only by admin
 const handleGetAllFranchises = async (req, res) => {
    try {
        const franchises = await Franchise.find({});
        return res.status(200).json(franchises);
    } catch (error) {
        console.error('Error fetching franchises:', error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
}




// 3. Assign Products to Franchise - only by admin
const handleAssignProductsToFranchise = async (req, res) => {
    try {
        const { franchiseId } = req.params; 
        const { products } = req.body;

        // Find the franchise by franchiseId
        const franchise = await Franchise.findOne({ franchiseId });
        if (!franchise) { return res.status(404).json({ message: 'Incorrect FranchiseID' }); }


        // Find or create the inventory for the franchise
        let inventory = await Inventory.findOne({ franchiseId: franchise._id });
        if (!inventory) {
            // If no inventory exists for the franchise, create a new one
            inventory = await Inventory.create({ franchiseId: franchise._id, products: [] });
        }

        // Loop through products and update inventory
        const assignedProducts = [];
        let totalPrice = 0;
        for (const product of products) {
            const { productId, quantity, price, bvPoints } = product; // Destructure all necessary fields
            if (!productId || !quantity || !price || !bvPoints) {
                return res.status(400).json({ message: 'Please enter all the Required fields.' });
            }

            // Check if the product exists in Products collection
            const productFound = await Product.findById(productId);
            if (!productFound) { return res.status(404).json({ message: `Product with ID ${productId} not found.` }); }

            // Check if the product quantity is available
            if( productFound.stock < quantity ) {
                return res.status(200).json({ message: `Product with productId: ${productId} has only ${productFound.stock} quantity in Stock.` });
            }


            // Add/Update product in the franchise's inventory
            const existingInventoryItem = inventory.products.find(item => item.productId.toString() === productId);
            if (existingInventoryItem) {
                // If the product already exists in the inventory, update the quantity and other details
                existingInventoryItem.quantity += quantity;     // Update quantity
                existingInventoryItem.price = price;            // Update price
                existingInventoryItem.bvPoints = bvPoints;      // Update bvPoints
                totalPrice += price*quantity;                   // Calculate Price
            } else {
                // If product does not exist, add it to the franchie's inventory
                inventory.products.push({ productId, quantity, price, bvPoints });
                totalPrice += price*quantity;
            }

            assignedProducts.push({ productId, quantity, price, bvPoints });
            productFound.stock -= quantity;
            await productFound.save();
        }

        // Save the updated inventory
        await inventory.save();

        // Respond with success
        return res.status(200).json( { message: 'Products assigned successfully to franchise', franchiseId, assignedProducts, totalPrice});
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};




// 4. Handle Get Franchies Inventory
const handleGetFranchiesInventory = async (req, res) => {
    try {
        const { franchiseId } = req.params;
        if (!franchiseId) { return res.status(400).json({ message: 'Please provide Franchise ID' }); }

        // Find the franchise by franchiseId
        const franchise = await Franchise.findOne({ franchiseId });
        if (!franchise) { return res.status(404).json({ message: 'Incorrect FranchiseID' }); }

        // Find the inventory for the franchise
        let inventory = await Inventory.findOne({ franchiseId: franchise._id });
        if (!inventory) {
            return res.status(200).json({ message: 'inventory not found' });
        }

        // Fetch product details from Products collection
        const products = await Product.find({ _id: { $in: inventory.products.map(item => item.productId) } });
        return res.status(200).json(products);
    } catch (e) {
        console.log(e.message);
        return res.status(500).json({message: 'Error finding Inventory', error: e.message});
    }
}





// 5. Remove Product from Franchise Inventory - only by admin
const handleRemoveProductFromFranchiseInventory = async (req, res) => {
    try {
        const { franchiseId, productId } = req.params;
        if (!franchiseId ||!productId) { return res.status(400).json({ message: 'Please provide both Franchise ID and Product ID' }); }
        
        
        // Find the franchise by franchiseId
        const franchise = await Franchise.findOne({ franchiseId });
        if (!franchise) { return res.status(404).json({ message: 'Franchise not found with the provided Franchise ID' }); } 


        // Find the inventory for the franchise
        let inventory = await Inventory.findOne({ franchiseId: franchise._id });
        if (!inventory) {
            return res.status(404).json({ message: 'Inventory not found for the given franchise' });
        }


        // Find and remove the product from the inventory
        const productIndex = inventory.products.findIndex(item => item.productId.toString() === productId);
        if (productIndex === -1) {
            return res.status(404).json({ message: 'Product not found in the franchise inventory' });
        }


        // Remove the product from the inventory array
        inventory.products.splice(productIndex, 1);


        // Save the updated inventory
        await inventory.save();

        // Respond with success
        return res.status(200).json({
            message: 'Product removed successfully from franchise inventory',
            franchiseId,
            productId
        });
    } catch (error) {
        console.error('Error removing product from franchise inventory:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};




// 6. Handle Login franchise
const handleLoginFranchise = async (req, res) => {
    try {
        const { franchiseId, password } = req.body;
        if ( !franchiseId || !password ) { return res.status(400).json({ message: 'Please provide both franchiseId and password.' }); }

        // Find the franchise by email
        const franchise = await Franchise.findOne({ franchiseId });
        if (!franchise) { return res.status(401).json({ message: 'Invalid franchiseId.' }); }

        // Check the password
        const isPasswordMatch = await franchise.comparePassword(password);
        if (isPasswordMatch) {
            const payload = { email: franchise.email, id: franchise._id, role: 'franchise' };
            const token = generateToken(payload);
            return res.json({ token, userId: franchise._id, name: franchise.franchiseName });
        } else {
            return res.status(404).json({ message: 'Invalid franchiseId or password.' });
        }
    } catch (error) {
        console.error('Error logging in franchise:', error);
        return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}





// 7. Handle Calculate totall Bill
const handleCalculateTotalBill = async (req, res) => {
    try {
        const { userSponsorId, franchiseId, products } = req.body;
        if (!franchiseId || !products) { return res.status(400).json({ message: 'Please provide both Franchise ID and Products.' }); }

        // Find user from sponsorId
        const user = await User.findOne({ mySponsorId: userSponsorId });
        if (!user) { return res.status(404).json({ message: 'Incorrect sponsorID' }); }

        // Find the franchise by franchiseId
        const franchise = await Franchise.findOne({ franchiseId });
        if (!franchise) { return res.status(404).json({ message: 'Incorrect FranchiseID' }); }

        // Find the inventory for the franchise
        let inventory = await Inventory.findOne({ franchiseId: franchise._id });
        if (!inventory) { return res.status(404).json({ message: 'Inventory not found for the given franchise' }); }

        // products recieved from body is an array, which contains multiple products. Check if all the products recieved exists in body OR not.
        for (let product of products) {
            const { productId, quantity } = product;
            if (!productId || !quantity) { return res.status(400).json({ message: 'Please provide both Product ID and Quantity for each product.' }); }
            
            const productFound = inventory.products.find(item => item.productId.toString() === productId);
            if (!productFound) { return res.status(404).json({ message: `Product with ID ${productId} not found in your inventory.` }); }
            
            if (productFound.quantity < quantity) {
                return res.status(200).json({ message: `Product with productId: ${productId} has only ${productFound.quantity} quantity in Stock.` });
            }
        }
        console.log('All products found in inventory & Stock is also available.');
        

        // Calculate total bill
        let totalPrice = 0;
        for (let product of products) {
            const { productId, quantity } = product;
            const productFound = inventory.products.find(item => item.productId.toString() === productId);
            totalPrice += productFound.price * quantity;
            
            // Reduce the product's stock
            productFound.quantity -= quantity;
            await inventory.save();

            // Add BV points to the user
            const bvPointsEarned = quantity * productFound.bvPoints;
            user.bvPoints += bvPointsEarned;
            await user.save();
            console.log(`User with ID ${user._id} has earned ${bvPointsEarned} BV points.`);

            // Add products purchased to user schema field 'productsPurchased'
            user.productsPurchased.push({ productId, quantity, price: productFound.price });
            await user.save();
            console.log(`User with ID ${user._id} has purchased product with ID ${productId} and quantity ${quantity}.`);
        }

        return res.status(200).json({ message: 'Total bill calculated successfully', totalPrice });
    } catch (error) {
        console.error('Error calculating total bill:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}







module.exports = {
    handleCreateFranchise,
    handleGetAllFranchises,
    handleAssignProductsToFranchise,
    handleGetFranchiesInventory,
    handleRemoveProductFromFranchiseInventory,
    handleLoginFranchise,
    handleCalculateTotalBill
}
