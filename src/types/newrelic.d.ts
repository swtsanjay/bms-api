declare module 'newrelic' {
    interface NewRelicApi {
        startBackgroundTransaction<T>(
            name: string,
            group: string,
            handler: () => Promise<T>
        ): Promise<T>;
        noticeError(error: unknown): void;
    }

    const newrelic: NewRelicApi;
    export = newrelic;
}
