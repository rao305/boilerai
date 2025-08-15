import 'express-session';

declare module 'express-session' {
	interface SessionData {
		oauthState?: string;
		returnUrl?: string;
	}
}

