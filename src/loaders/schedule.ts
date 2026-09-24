import newrelic from 'newrelic';
import Logger from '../lib/Logger';
import CommerceMaintenanceService from '../modules/commerce/maintenance/service';
import {
	processPendingRazorpayWebhooks,
	processPendingRazorpayRefunds,
	reconcilePendingRazorpayPayments
} from '../modules/commerce/payment/webhook-service';
import { processCommerceEmailOutbox } from '../modules/commerce/email/service';

export class Schedule {
	private static commerceMaintenanceInterval: ReturnType<typeof setInterval> | null = null;
	private static razorpayInterval: ReturnType<typeof setInterval> | null = null;
	private static emailInterval: ReturnType<typeof setInterval> | null = null;

	static async init() {
		Schedule.deleteTempFiles();
		Schedule.startCommerceMaintenance();
		Schedule.startRazorpayProcessing();
		Schedule.startEmailProcessing();
	}

	static startEmailProcessing() {
		if (Schedule.emailInterval) return;
		const run = () => newrelic.startBackgroundTransaction('commerce/email-outbox', 'Scheduled jobs', async () => {
			try {
				const sent = await processCommerceEmailOutbox();
				if (sent) Logger.info(`Sent ${sent} commerce transactional email(s)`);
			} catch (error: any) {
				newrelic.noticeError(error);
				Logger.error('Commerce email background processing failed', { message: error?.message || error });
			}
		});
		run().catch(() => undefined);
		Schedule.emailInterval = setInterval(run, 15 * 1000);
	}

	static startRazorpayProcessing() {
		if (Schedule.razorpayInterval) return;
		const run = () => newrelic.startBackgroundTransaction('commerce/razorpay-processing', 'Scheduled jobs', async () => {
			try {
				await processPendingRazorpayWebhooks();
				await reconcilePendingRazorpayPayments();
				await processPendingRazorpayRefunds();
			} catch (error: any) {
				newrelic.noticeError(error);
				Logger.error('Razorpay background processing failed', { message: error?.message || error });
			}
		});
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
		const run = () => newrelic.startBackgroundTransaction('commerce/maintenance', 'Scheduled jobs', async () => {
			try {
				const released = await CommerceMaintenanceService.releaseExpiredReservations();
				if (released) Logger.info(`Released ${released} expired commerce inventory reservation(s)`);
				const creditsReleased = await CommerceMaintenanceService.releaseMatureReferralCredits();
				if (creditsReleased) Logger.info(`Released ${creditsReleased} matured Vastriqo Credit reward(s)`);
			} catch (error: any) {
				newrelic.noticeError(error);
				Logger.error('Commerce reservation maintenance failed', { message: error?.message || error });
			}
		});
		run().catch(() => undefined);
		Schedule.commerceMaintenanceInterval = setInterval(run, 5 * 60 * 1000);
	}

}
