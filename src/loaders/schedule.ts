export class Schedule {
	static async init() {
		Schedule.deleteTempFiles();
	}

	/**
	 * @description deletes old temporary files older than 10 hours every hour
	 */
	static deleteTempFiles() {
	}
}
