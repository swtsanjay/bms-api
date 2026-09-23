import Logger from '../lib/Logger';
import CommerceMaintenanceService from '../modules/commerce/maintenance/service';
import {
	processPendingRazorpayWebhooks,
	processPendingRazorpayRefunds,
	reconcilePendingRazorpayPayments
} from '../modules/commerce/payment/webhook-service';

export class Schedule {
	private static commerceMaintenanceInterval: ReturnType<typeof setInterval> | null = null;
	private static razorpayInterval: ReturnType<typeof setInterval> | null = null;

	static async init() {
		Schedule.deleteTempFiles();
		Schedule.startCommerceMaintenance();
		Schedule.startRazorpayProcessing();
	}

	static startRazorpayProcessing() {
		if (Schedule.razorpayInterval) return;
		const run = async () => {
			try {
				await processPendingRazorpayWebhooks();
				await reconcilePendingRazorpayPayments();
				await processPendingRazorpayRefunds();
			} catch (error: any) {
				Logger.error('Razorpay background processing failed', { message: error?.message || error });
			}
		};
		run().catch(() => undefined);
		Schedule.razorpayInterval = setInterval(run, 30 * 1000);
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
				const creditsReleased = await CommerceMaintenanceService.releaseMatureReferralCredits();
				if (creditsReleased) Logger.info(`Released ${creditsReleased} matured Vastriqo Credit reward(s)`);
			} catch (error: any) {
				Logger.error('Commerce reservation maintenance failed', { message: error?.message || error });
			}
		};
		run().catch(() => undefined);
		Schedule.commerceMaintenanceInterval = setInterval(run, 5 * 60 * 1000);
	}

}
