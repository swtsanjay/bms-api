import Logger from '../lib/Logger';
import CommerceMaintenanceService from '../modules/commerce/maintenance/service';

export class Schedule {
	private static commerceMaintenanceInterval: ReturnType<typeof setInterval> | null = null;

	static async init() {
		Schedule.deleteTempFiles();
		Schedule.startCommerceMaintenance();
	}

	/**
	 * @description deletes old temporary files older than 10 hours every hour
	 */
	static deleteTempFiles() {
	}

	static startCommerceMaintenance() {
		if (Schedule.commerceMaintenanceInterval) return;
		const run = async () => {
			try {
				const released = await CommerceMaintenanceService.releaseExpiredReservations();
				if (released) Logger.info(`Released ${released} expired commerce inventory reservation(s)`);
			} catch (error: any) {
				Logger.error('Commerce reservation maintenance failed', { message: error?.message || error });
			}
		};
		run().catch(() => undefined);
		Schedule.commerceMaintenanceInterval = setInterval(run, 5 * 60 * 1000);
	}

}
