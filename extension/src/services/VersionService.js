import { SITE_CONFIG } from '../config/constants.js';

export class VersionService {
    static API_URL = `${SITE_CONFIG.SITE_URL}/api/extension-info`;
    static DISMISSED_NOTIFICATIONS_KEY = 'dismissed_notifications';

    static async checkVersion() {
        try {
            const manifest = chrome.runtime.getManifest();
            const currentVersion = manifest.version;

            const response = await fetch(this.API_URL);

            if (!response.ok) {
                throw new Error(`Failed to fetch version info: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.latestVersion || !data.minimumVersion) {
                throw new Error('Invalid version info data structure');
            }
            
            if (!Array.isArray(data.notifications)) {
                data.notifications = [];
            }

            return this.compareVersions(currentVersion, data);
        } catch (error) {
            console.error('Version check failed:', error);
            return {
                currentVersion: chrome.runtime.getManifest().version,
                isLatest: true,
                notifications: [],
                error: error.message,
                isCritical: false
            };
        }
    }

    static compareVersions(current, data) {
        const isLatest = this.isVersionGreaterOrEqual(current, data.latestVersion);
        const isSupported = this.isVersionGreaterOrEqual(current, data.minimumVersion);

        return {
            currentVersion: current,
            latestVersion: data.latestVersion,
            isLatest,
            isSupported,
            isOutdated: !isLatest,
            isCritical: !isSupported,
            downloadUrl: data.downloadUrl,
            changelog: data.changelog?.[data.latestVersion] || {},
            notifications: this.getActiveNotifications(data.notifications || []),
            support: data.support
        };
    }

    static async getNotifications() {
        try {
            const response = await fetch(this.API_URL);

            if (!response.ok) {
                throw new Error(`Failed to fetch notifications: ${response.status}`);
            }

            const data = await response.json();
            
            if (!Array.isArray(data.notifications)) {
                console.warn('Notifications field is not an array');
                return [];
            }

            return this.getActiveNotifications(data.notifications);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
            return [];
        }
    }

    static isVersionGreaterOrEqual(version1, version2) {
        const v1Parts = version1.split('.').map(Number);
        const v2Parts = version2.split('.').map(Number);

        for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
            const v1 = v1Parts[i] || 0;
            const v2 = v2Parts[i] || 0;

            if (v1 > v2) return true;
            if (v1 < v2) return false;
        }

        return true; // Equal
    }

    static getActiveNotifications(notifications) {
        if (!Array.isArray(notifications)) {
            console.error('Notifications is not an array:', notifications);
            return [];
        }

        const now = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
        
        return notifications.filter(notification => {
            // Validate required fields
            if (!notification.id || !notification.title || !notification.message) {
                console.warn('Invalid notification (missing required fields):', notification);
                return false;
            }

            const validFrom = notification.validFrom || '2000-01-01';
            const validUntil = notification.validUntil || '2099-12-31';
            
            // String comparison works for ISO date format (YYYY-MM-DD)
            const isActive = now >= validFrom && now <= validUntil;
            
            if (!isActive) {
                console.log(`Notification "${notification.id}" is not active. Current: ${now}, Valid: ${validFrom} to ${validUntil}`);
            }
            
            return isActive;
        });
    }

    static async getDismissedNotifications() {
        try {
            const result = await chrome.storage.local.get(this.DISMISSED_NOTIFICATIONS_KEY);
            return result[this.DISMISSED_NOTIFICATIONS_KEY] || [];
        } catch (error) {
            console.error('Failed to get dismissed notifications:', error);
            return [];
        }
    }

    static async dismissNotification(notificationId) {
        try {
            const dismissed = await this.getDismissedNotifications();
            if (!dismissed.includes(notificationId)) {
                dismissed.push(notificationId);
                await chrome.storage.local.set({
                    [this.DISMISSED_NOTIFICATIONS_KEY]: dismissed
                });
            }
        } catch (error) {
            console.error('Failed to dismiss notification:', error);
        }
    }

    static async getUnreadNotifications() {
        try {
            // Always fetch fresh notifications (no cache)
            const notifications = await this.getNotifications();
            const dismissed = await this.getDismissedNotifications();
            
            return notifications.filter(notification => 
                !dismissed.includes(notification.id)
            );
        } catch (error) {
            console.error('Failed to get unread notifications:', error);
            return [];
        }
    }

}
