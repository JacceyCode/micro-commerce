import express, { Router } from "express";
import {
  createDiscountCode,
  createProduct,
  deleteDiscountCode,
  deleteProduct,
  deleteProductImage,
  getCategories,
  getDiscountCode,
  getShopProducts,
  restoreProduct,
  uploadProductImage,
} from "../controllers/product.controller";
import isAuthenticated from "@packages/middleware/isAuthenticated";

const router: Router = express.Router();

router.get("/get-categories", getCategories);
router.get("/get-discount-codes", isAuthenticated, getDiscountCode);
router.get("/get-shop-products", isAuthenticated, getShopProducts);
router.post("/create-discount-code", isAuthenticated, createDiscountCode);
router.post("/upload-product-image", isAuthenticated, uploadProductImage);
router.post("/create-product", isAuthenticated, createProduct);
router.put("/restore-product/:productId", isAuthenticated, restoreProduct);
router.delete("/delete-product-image", isAuthenticated, deleteProductImage);
router.delete("/delete-discount-code/:id", isAuthenticated, deleteDiscountCode);
router.delete("/delete-product/:productId", isAuthenticated, deleteProduct);

export default router;
