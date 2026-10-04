import { StorageService } from './StorageService.js';
import { ERP_CONFIG } from '../config/constants.js';

export class CredentialService {

    static async saveUserData(rollNumber, password, securityQuestions) {
        const credentials = {
            rollNumber,
            password,
            securityQuestions,
            timestamp: Date.now()
        };
        
        return await StorageService.setUserData(credentials);
    }

    static async saveERPSession(sessionData) {
        const erpSession = {
            sessionToken: sessionData.sessionToken,
            ssoToken: sessionData.ssoToken,
            cookies: sessionData.cookies,
            timestamp: Date.now()
        };
        
        return await StorageService.set('erp_session', erpSession);
    }

    static async getERPSession() {
        const session = await StorageService.get('erp_session');
        if (!session) return null;
        
        return session;
    }

    static async clearERPSession() {
        return await StorageService.remove('erp_session');
    }


    static async updateUserData(updates) {
        const existing = await StorageService.getUserData();
        if (!existing) return false;
        
        const updated = { ...existing, ...updates };
        return await StorageService.setUserData(updated);
    }

    static async clearUserData() {
        return await StorageService.remove('user_data');
    }

    static async validateUserData(rollNumber, password) {
        if (!rollNumber || !password) return false;
        if (rollNumber.length < 8 || password.length < 6) return false;
        return true;
    }

    static generateSecurityQuestionId(question) {
        return question.toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .substring(0, 20);
    }

    static async saveGmailData(gmailData) {
        return await StorageService.set('gmail_data', gmailData);
    }

    static async getGmailData() {
        return await StorageService.get('gmail_data');
    }

    static async clearGmailData() {
        return await StorageService.remove('gmail_data');
    }

    static async isERPSessionValid() {
        const session = await StorageService.get('erp_session');
        if (!session) return false;
        
        try {
            // Fetch the ERP homepage. If the session is valid, the server will serve
            // the authenticated page and response.url will stay on IIT_ERP3.
            // If the session expired, the server redirects back to the SSO login page
            // (SSOAdministration/login.htm), so response.url will contain 'SSOAdministration'.
            const response = await fetch(ERP_CONFIG.HOMEPAGE_URL, {
                method: 'GET',
                credentials: 'include'
            });
            
            const finalUrl = response.url || '';
            // If we stayed on IIT_ERP3 (not redirected to SSO login), session is valid
            return finalUrl.includes('IIT_ERP3') && !finalUrl.includes('SSOAdministration');
        } catch (error) {
            console.error('Failed to validate ERP session:', error);
            return false;
        }
    }


}
