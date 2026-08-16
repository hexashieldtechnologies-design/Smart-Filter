import { Router, type IRouter } from "express";
import healthRouter from "./health";
import vaultRouter from "./vault";
import smartFillRouter from "./smartFill";

const router: IRouter = Router();

router.use(healthRouter);
router.use(vaultRouter);
router.use(smartFillRouter);

export default router;
