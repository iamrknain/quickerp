import { ERP_CONFIG, ERROR_MESSAGES } from '../config/constants.js';
import { GmailService } from './GmailService.js';

export class ERPApiService {
    static async getSessionToken() {
        try {
            const response = await fetch(ERP_CONFIG.HOMEPAGE_URL, {
                method: 'GET',
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Failed to get homepage - Status: ' + response.status);
            }
            
            const html = await response.text();
            
            // Try multiple session token patterns
            const sessionTokenPatterns = [
                /id=["']sessionToken["'][^>]*value=["']([^"']+)["']/,
                /name=["']sessionToken["'][^>]*value=["']([^"']+)["']/,
                /sessionToken["'][^>]*value=["']([^"']+)["']/,
                /<input[^>]*sessionToken[^>]*value=["']([^"']+)["']/i,
                /sessionToken[^>]*=["']([^"']+)["']/i
            ];
            
            let sessionToken = null;
            for (let i = 0; i < sessionTokenPatterns.length; i++) {
                const match = html.match(sessionTokenPatterns[i]);
                if (match) {
                    sessionToken = match[1];
                    break;
                }
            }
            
            if (!sessionToken) {
                // Try to find any token-like string in the page
                const tokenMatch = html.match(/[A-F0-9]{32,}/);
                if (tokenMatch) {
                    sessionToken = tokenMatch[0];
                } else {
                    throw new Error('Session token not found in homepage');
                }
            }
            
            return sessionToken;
        } catch (error) {
            console.error('ERPApiService: Failed to get session token:', error);
            throw error;
        }
    }

    static async getSecurityQuestion(rollNumber) {
        try {
            
            const headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            };
            
            const formData = new URLSearchParams();
            formData.append('user_id', rollNumber);
            
            
            const response = await fetch(ERP_CONFIG.SECURITY_URL, {
                method: 'POST',
                headers: headers,
                body: formData,
                credentials: 'include'
            });
            
            
            
            if (!response.ok) {
                throw new Error('Failed to get security question - Status: ' + response.status);
            }
            
            const question = await response.text();
            
            if (question.trim() === 'FALSE') {
                throw new Error('Invalid Roll Number');
            }
            
            return question.trim();
        } catch (error) {
            console.error('ERPApiService: Failed to get security question:', error);
            throw error;
        }
    }

    static async getSecurityQuestions(rollNumber) {
        try {
            const questions = new Set();
            const maxAttempts = 10;
            let attempts = 0;
            
            while (questions.size < 3 && attempts < maxAttempts) {
                try {
                    const question = await this.getSecurityQuestion(rollNumber);
                    questions.add(question);
                    attempts++;
                } catch (error) {
                    // If we get an error (like invalid roll number)
                    throw error;
                }
            }
            
            if (questions.size < 3) {
                throw new Error(`Could only fetch ${questions.size} unique questions after ${maxAttempts} attempts`);
            }
            
            return Array.from(questions);
        } catch (error) {
            console.error('Failed to get security questions:', error);
            throw error;
        }
    }

    static async requestOTP(credentials, sessionToken, securityAnswer) {
        try {
            const loginDetails = {
                user_id: credentials.rollNumber,
                password: credentials.password,
                answer: securityAnswer,
                typeee: 'SI',
                sessionToken: sessionToken,
                requestedUrl: ERP_CONFIG.HOMEPAGE_URL
            };
            
            const formData = new URLSearchParams();
            Object.keys(loginDetails).forEach(key => {
                formData.append(key, loginDetails[key]);
            });
            
            const headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            };
            
            
            const response = await fetch(ERP_CONFIG.OTP_URL, {
                method: 'POST',
                headers: headers,
                body: formData,
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Failed to request OTP - Status: ' + response.status);
            }
            
            const result = await response.json();
            
            if (result.msg === 'ANSWER_MISMATCH') {
                throw new Error('Invalid Security Question Answer');
            }
            if (result.msg === 'PASSWORD_MISMATCH') {
                throw new Error('Invalid Password');
            }
            
            // Check for success message (OTP sent successfully)
            if (result.msg && result.msg.includes('OTP') && result.msg.includes('sent')) {
                return result;
            }
            
            // Only throw error if it's actually an error message
            if (result.msg && !result.msg.includes('sent')) {
                throw new Error(`Failed to request OTP: ${result.msg}`);
            }
            
            return result;
        } catch (error) {
            console.error('ERPApiService: Failed to request OTP:', error);
            throw error;
        }
    }

    static async _syncCookiesToBrowser() {
        try {
            if (!chrome.cookies) {
                console.warn('chrome.cookies API not available. Did you add "cookies" to permissions?');
                return;
            }
            const cookies = await chrome.cookies.getAll({ domain: 'erp.iitkgp.ac.in' });
            for (const cookie of cookies) {
                const newCookie = {
                    url: 'https://erp.iitkgp.ac.in',
                    name: cookie.name,
                    value: cookie.value,
                    path: cookie.path,
                    secure: cookie.secure,
                    httpOnly: cookie.httpOnly,
                    sameSite: cookie.sameSite
                };
                if (!cookie.hostOnly) newCookie.domain = cookie.domain;
                if (cookie.expirationDate) newCookie.expirationDate = cookie.expirationDate;
                
                // Writing to this URL without partitionKey sets it globally
                await chrome.cookies.set(newCookie);
                console.log('Synced cookie to main browser:', cookie.name);
            }
        } catch (err) {
            console.error('Failed to sync cookies to main browser:', err);
        }
    }

    static async submitLogin(credentials, sessionToken, otp, securityAnswer) {
        try {
            const loginDetails = {
                user_id: credentials.rollNumber,
                password: credentials.password,
                answer: securityAnswer,
                typeee: 'SI',
                sessionToken: sessionToken,
                requestedUrl: ERP_CONFIG.HOMEPAGE_URL,
                email_otp: otp
            };
            
            const formData = new URLSearchParams();
            Object.keys(loginDetails).forEach(key => {
                formData.append(key, loginDetails[key]);
            });
            
            const headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            };
            
            const response = await fetch(ERP_CONFIG.LOGIN_URL, {
                method: 'POST',
                headers: headers,
                body: formData,
                credentials: 'include',
                redirect: 'follow'
            });
            
            
            const text = await response.text();
            
            if (text.includes('ERROR:Email OTP mismatch')) {
                throw new Error('Invalid OTP');
            }
            
            if (text.includes('Unable to send OTP due to password mismatch')) {
                throw new Error('Authentication failed - invalid credentials');
            }
            
            if (text.includes('Unable to send OTP due to security question\'s answare mismatch')) {
                throw new Error('Invalid security question answer');
            }
            
            // On successful auth, the server redirects to IIT_ERP3 pages.
            // Since fetch follows redirects, response.url will be the final URL.
            // Check if we landed on an IIT_ERP3 page (not back on the SSO login page).
            const finalUrl = response.url || '';
            if (
                finalUrl.includes('IIT_ERP3') ||
                finalUrl.includes('welcome.jsp') ||
                finalUrl.includes('home.jsp')
            ) {
                await this._syncCookiesToBrowser();
                
                // Extract ssoToken from final URL if present
                const ssoTokenMatch = finalUrl.match(/ssoToken=([^&]+)/);
                return {
                    success: true,
                    message: 'Login successful',
                    ssoToken: ssoTokenMatch ? ssoTokenMatch[1] : null
                };
            }

            // Also check response body for authenticated page content
            if (text.includes('Welcome to ERP') || text.includes('welcome.jsp') || text.includes('home.jsp') || 
                text.includes('IIT_ERP3') || text.includes('logout') || text.includes('Logout')) {
                await this._syncCookiesToBrowser();
                return { success: true, message: 'Login successful' };
            }
            
            throw new Error('Login failed - redirected back to login page. Check your credentials or OTP.');
        } catch (error) {
            console.error('ERPApiService: Login submission failed:', error);
            throw error;
        }
    }

    static async performFullLogin(credentials = null, onProgress = null) {
        try {
            
            if (!credentials) {
                const { StorageService } = await import('./StorageService.js');
                credentials = await StorageService.getUserData();
                if (!credentials) {
                    throw new Error('No credentials found. Please complete setup first.');
                }
            }
            
            
            onProgress?.('init', 'Getting session token');
            const sessionToken = await this.getSessionToken();
            
            onProgress?.('security', 'Getting security question');
            const securityQuestion = await this.getSecurityQuestion(credentials.rollNumber);
            
            let securityQuestionsMap = {};
            
            if (Array.isArray(credentials.securityQuestions)) {
                credentials.securityQuestions.forEach((qa, index) => {
                    if (qa && qa.question && qa.answer) {
                        securityQuestionsMap[qa.question] = qa.answer;
                    }
                });
            } else {
                securityQuestionsMap = credentials.securityQuestions || {};
            }
            
            
            let securityAnswer = securityQuestionsMap[securityQuestion];
            
            if (!securityAnswer) {
                
                const normalizeText = (text) => text.toLowerCase().replace(/[^a-z0-9]/g, '');
                const apiQuestionNorm = normalizeText(securityQuestion);
                
                for (const storedQuestion in securityQuestionsMap) {
                    const storedQuestionNorm = normalizeText(storedQuestion);
                    
                    // Strategy 1: Exact normalized match
                    if (apiQuestionNorm === storedQuestionNorm) {
                        securityAnswer = securityQuestionsMap[storedQuestion];
                        break;
                    }
                    
                    // Strategy 2: Contains match (either direction)
                    if (apiQuestionNorm.includes(storedQuestionNorm) || storedQuestionNorm.includes(apiQuestionNorm)) {
                        securityAnswer = securityQuestionsMap[storedQuestion];
                        break;
                    }
                    
                    // Strategy 3: Key word matching for common questions
                    const apiWords = apiQuestionNorm.split(/\s+/);
                    const storedWords = storedQuestionNorm.split(/\s+/);
                    const commonWords = apiWords.filter(word => storedWords.includes(word) && word.length > 2);
                    
                    if (commonWords.length >= 2) {
                        securityAnswer = securityQuestionsMap[storedQuestion];
                        break;
                    }
                }
                
            }
            
            if (!securityAnswer) {
                throw new Error(`No answer found for security question: "${securityQuestion}". Available questions: ${Object.keys(securityQuestionsMap).join(', ')}`);
            }
            
            
            onProgress?.('otp', 'Requesting OTP');
            await this.requestOTP(credentials, sessionToken, securityAnswer);
            
            onProgress?.('otp', 'Retrieving OTP from Gmail');
            
            let loginResult;
            let attempts = 0;
            const maxAttempts = 10;
            
            // Capture time just before requesting OTP to filter out old emails
            const otpRequestTime = Date.now();
            
            while (attempts < maxAttempts) {
                try {
                    const otp = await GmailService.getLatestOTP(10, 5000, (step, data) => {
                        if (step === 'polling') {
                            onProgress?.('polling', data);
                        }
                    }, otpRequestTime);
                    
                    onProgress?.('polling', {
                        message: 'Logging into ERP system...',
                        status: 'logging_in'
                    });
                    loginResult = await this.submitLogin(credentials, sessionToken, otp, securityAnswer);
                    
                    // If we get here, login was successful
                    break;
                    
                } catch (error) {
                    attempts++;
                    
                    if (error.message === 'Invalid OTP' && attempts < maxAttempts) {
                        onProgress?.('otp', `Invalid OTP, waiting for new one (${attempts}/${maxAttempts})...`);
                        await new Promise(resolve => setTimeout(resolve, 5000));
                    } else {
                        // Either not an OTP error, or we've exhausted attempts
                        throw error;
                    }
                }
            }
            
            if (!loginResult) {
                throw new Error(`Login failed after ${maxAttempts} OTP attempts`);
            }
             
            return { ...loginResult, sessionToken };
        } catch (error) {
            console.error('ERPApiService: Full login failed with error:', error);
            console.error('ERPApiService: Error stack:', error.stack);
            throw error;
        }
    }

    static async openAuthenticatedERP(session) {
        try {
            const url = ERP_CONFIG.HOMEPAGE_URL;
            const tab = await chrome.tabs.create({ url, active: true });
            return tab;
        } catch (error) {
            console.error('Failed to open ERP:', error);
            throw error;
        }
    }

}
