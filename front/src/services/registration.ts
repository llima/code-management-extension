import { Services } from "./services";
import { BranchService, BranchServiceId } from "./branch";

Services.registerService(BranchServiceId, BranchService);
