import axios, {AxiosError} from "axios";

interface FlareSolverrCookie {
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number;
    size: number;
    httpOnly: boolean;
    secure: boolean;
    session: boolean;
    sameSite: string;
}

interface FlareSolverrSolution {
    url: string;
    status: number;
    headers: Record<string, string>;
    response: string;
    cookies: FlareSolverrCookie[];
    userAgent: string;
}

interface FlareSolverrResponse {
    status: 'ok' | 'error';
    message: string;
    startTimestamp: number;
    endTimestamp: number;
    version: string;
    solution?: FlareSolverrSolution;
}

interface ScrapeResult {
    html: string;
    cookies: FlareSolverrCookie[];
    userAgent: string;
}

const FLARESOLVERR_URL = 'http://10.0.0.186:8191/v1';

export async function scrapeWithFlareSolverr(targetUrl: string): Promise<ScrapeResult | null> {
    try {
        const { data } = await axios.post<FlareSolverrResponse>(
            FLARESOLVERR_URL,
            {
                cmd: 'request.get',
                url: targetUrl,
                maxTimeout: 60000,
            },
            {
                headers: { 'Content-Type': 'application/json' },
                timeout: 65000, // Slightly higher than maxTimeout so Axios doesn't abort early
            }
        );

        if (data.status === 'ok' && data.solution) {
            console.log('Successfully bypassed Cloudflare!');
            return {
                html: data.solution.response,
                cookies: data.solution.cookies,
                userAgent: data.solution.userAgent,
            };
        }

        console.error('FlareSolverr returned an error:', data.message);
        return null;
    } catch (err) {
        const error = err as AxiosError;
        console.error('Request error:', error.message);
        return null;
    }
}
