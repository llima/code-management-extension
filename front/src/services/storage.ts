import {
    IExtensionDataManager,
    IExtensionDataService
} from "azure-devops-extension-api";

import {
    getAccessToken,
    getExtensionContext,
    getService
} from "azure-devops-extension-sdk";

export async function getStorageManager(): Promise<IExtensionDataManager> {
    
    const context = getExtensionContext();
    const extensionDataService = await getService<IExtensionDataService>(
        "ms.vss-features.extension-data-service"
    );
    const accessToken = await getAccessToken();
    return extensionDataService.getExtensionDataManager(
        context.id,
        accessToken
    );
}
