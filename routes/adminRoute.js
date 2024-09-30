const express = require('express');
const router = express.Router();
const upload = require('../middlewares/multer'); 
const { isAdminMiddleware } = require('../middlewares/jwt');
const { handleAdminLogin, handleCreateAdmin} = require('../controllers/adminController');
const { handleAddProduct, handleEditProduct, handleDeleteProduct, handleViewProducts } = require('../controllers/productController');
const { handleCreateFranchise, handleGetAllFranchises } = require('../controllers/franchiseController');   


// Authentication Routes
router.post('/create', handleCreateAdmin);  
router.post('/login', handleAdminLogin);


// Product Routes
router.post('/addProduct', isAdminMiddleware, upload.single('picture'), handleAddProduct);
router.post('/editProduct/:id', isAdminMiddleware, upload.single('picture'), handleEditProduct);         // DONE
router.delete('/deleteProduct/:id', isAdminMiddleware, handleDeleteProduct);
router.get('/viewProducts', isAdminMiddleware, handleViewProducts);


// Franchise routes
router.post('/franchise/create', handleCreateFranchise);
router.get('/getAllFranchies',  handleGetAllFranchises);



module.exports = router;