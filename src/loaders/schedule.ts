import Logger from '../lib/Logger';
import ShopifyApisService from '../api/admin/modules/shopify-apis/service';

export class Schedule {
	private static shopifyAdminTokenInterval: ReturnType<typeof setInterval> | null = null;

	static async init() {
		Schedule.deleteTempFiles();
		Schedule.refreshShopifyAdminToken();
	}

	/**
	 * @description deletes old temporary files older than 10 hours every hour
	 */
	static deleteTempFiles() {
	}

	static refreshShopifyAdminToken() {
		if (Schedule.shopifyAdminTokenInterval) {
			return;
		}

		const refreshToken = async () => {
			try {
				const token = await ShopifyApisService.fetchAndStoreAdminAccessTokenFromConfig();
				if (!token) {
					Logger.info('Shopify Admin token refresh skipped: configuration missing');
					return;
				}

				Logger.info('Shopify Admin token refreshed');
			} catch (error: any) {
				Logger.error('Shopify Admin token refresh failed', {
					message: error?.message || error
				});
			}
		};

		refreshToken().catch(() => { });
		Schedule.shopifyAdminTokenInterval = setInterval(refreshToken, 4 * 60 * 60 * 1000);
	}
}
