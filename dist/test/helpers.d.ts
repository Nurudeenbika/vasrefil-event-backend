export declare const registerTestUser: (userData: {
    name: string;
    email: string;
    password: string;
    role?: string;
}) => Promise<import("superagent/lib/node/response")>;
export declare const loginTestUser: (credentials: {
    email: string;
    password: string;
}) => Promise<import("superagent/lib/node/response")>;
export declare const getAuthToken: (res: any) => string;
//# sourceMappingURL=helpers.d.ts.map