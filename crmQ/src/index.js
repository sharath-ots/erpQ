export {
  ErpNextGatewayClient,
  GatewayErpNextError,
} from "./api/index.js";
export { DESK_PATHS } from "./constants/deskPaths.js";
export { joinDeskUrl, deskQuickLinks } from "./utils/deskUrl.js";
export { fetchCrmMetrics } from "./services/crmMetrics.js";
export {
  CrmqDashboard,
  DocTypeExplorer,
  CrmqShell,
  CrmEntityList,
  CrmOtherDocTypesPage,
  ErpDeskIframe,
} from "./ui/index.js";
export { CRM_LIST_VIEWS, curatedDocTypeSet, getListViewConfig } from "./constants/crmListViews.js";
