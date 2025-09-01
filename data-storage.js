// Data Storage Module for Solana Swap Application
// This module handles all data persistence and management

class DataStorage {
    constructor() {
        this.storageKey = 'solanaSwapData';
        this.userDataKey = 'solanaSwapUsers';
        this.adminDataKey = 'solanaSwapAdmin';
    }

    // Save user data
    saveUserData(address, balances, additionalData = {}) {
        try {
            const userData = {
                address: address,
                balances: balances,
                timestamp: new Date().toISOString(),
                connectionCount: this.getConnectionCount(address) + 1,
                ...additionalData
            };

            // Get existing data
            const existingData = this.getUserData();
            const userIndex = existingData.findIndex(user => user.address === address);

            if (userIndex >= 0) {
                existingData[userIndex] = userData;
            } else {
                existingData.push(userData);
            }

            // Save to localStorage
            localStorage.setItem(this.userDataKey, JSON.stringify(existingData));
            
            console.log('User data saved:', userData);
            return true;
        } catch (error) {
            console.error('Error saving user data:', error);
            return false;
        }
    }

    // Get user data
    getUserData() {
        try {
            const data = localStorage.getItem(this.userDataKey);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error loading user data:', error);
            return [];
        }
    }

    // Get connection count for a specific address
    getConnectionCount(address) {
        try {
            const existingData = this.getUserData();
            const user = existingData.find(user => user.address === address);
            return user ? user.connectionCount : 0;
        } catch (error) {
            return 0;
        }
    }

    // Save admin data
    saveAdminData(adminData) {
        try {
            const data = {
                ...adminData,
                lastUpdated: new Date().toISOString()
            };
            localStorage.setItem(this.adminDataKey, JSON.stringify(data));
            console.log('Admin data saved:', data);
            return true;
        } catch (error) {
            console.error('Error saving admin data:', error);
            return false;
        }
    }

    // Get admin data
    getAdminData() {
        try {
            const data = localStorage.getItem(this.adminDataKey);
            return data ? JSON.parse(data) : {
                totalWallets: 0,
                totalSOL: 0,
                totalUSDC: 0,
                totalSwaps: 0,
                totalTransfers: 0,
                adminBalance: 0,
                connectedWallets: []
            };
        } catch (error) {
            console.error('Error loading admin data:', error);
            return {
                totalWallets: 0,
                totalSOL: 0,
                totalUSDC: 0,
                totalSwaps: 0,
                totalTransfers: 0,
                adminBalance: 0,
                connectedWallets: []
            };
        }
    }

    // Update admin statistics
    updateAdminStats(userData) {
        try {
            const adminData = this.getAdminData();
            
            adminData.totalWallets = userData.length;
            adminData.totalSOL = userData.reduce((sum, user) => sum + (user.balances.sol || 0), 0);
            adminData.totalUSDC = userData.reduce((sum, user) => sum + (parseFloat(user.balances.usdc) || 0), 0);
            adminData.connectedWallets = userData;
            
            this.saveAdminData(adminData);
            return adminData;
        } catch (error) {
            console.error('Error updating admin stats:', error);
            return null;
        }
    }

    // Export all data
    exportData() {
        try {
            const exportData = {
                timestamp: new Date().toISOString(),
                userData: this.getUserData(),
                adminData: this.getAdminData(),
                version: '1.0.0'
            };

            return exportData;
        } catch (error) {
            console.error('Error exporting data:', error);
            return null;
        }
    }

    // Clear all data
    clearAllData() {
        try {
            localStorage.removeItem(this.userDataKey);
            localStorage.removeItem(this.adminDataKey);
            console.log('All data cleared');
            return true;
        } catch (error) {
            console.error('Error clearing data:', error);
            return false;
        }
    }

    // Get data statistics
    getDataStats() {
        try {
            const userData = this.getUserData();
            const adminData = this.getAdminData();
            
            return {
                totalUsers: userData.length,
                totalConnections: userData.reduce((sum, user) => sum + (user.connectionCount || 0), 0),
                lastActivity: userData.length > 0 ? Math.max(...userData.map(user => new Date(user.timestamp).getTime())) : null,
                adminStats: adminData
            };
        } catch (error) {
            console.error('Error getting data stats:', error);
            return null;
        }
    }

    // Backup data to file
    backupData() {
        try {
            const data = this.exportData();
            if (!data) return false;

            const dataStr = JSON.stringify(data, null, 2);
            const dataBlob = new Blob([dataStr], {type: 'application/json'});
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `solana-swap-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            return true;
        } catch (error) {
            console.error('Error backing up data:', error);
            return false;
        }
    }

    // Restore data from file
    restoreData(file) {
        return new Promise((resolve, reject) => {
            try {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        
                        if (data.userData) {
                            localStorage.setItem(this.userDataKey, JSON.stringify(data.userData));
                        }
                        
                        if (data.adminData) {
                            localStorage.setItem(this.adminDataKey, JSON.stringify(data.adminData));
                        }
                        
                        console.log('Data restored successfully');
                        resolve(true);
                    } catch (parseError) {
                        console.error('Error parsing restore data:', parseError);
                        reject(parseError);
                    }
                };
                reader.onerror = (error) => {
                    console.error('Error reading file:', error);
                    reject(error);
                };
                reader.readAsText(file);
            } catch (error) {
                console.error('Error restoring data:', error);
                reject(error);
            }
        });
    }
}

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataStorage;
} else {
    window.DataStorage = DataStorage;
}
