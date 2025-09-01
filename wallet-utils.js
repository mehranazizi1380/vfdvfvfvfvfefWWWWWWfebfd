// Wallet Utility Functions for Solana Swap
// This file contains helper functions for wallet connection and management

class WalletManager {
    constructor() {
        this.connection = null;
        this.walletState = {
            connected: false,
            address: '',
            publicKey: null,
            tokenAccount: null,
            balances: {
                sol: 0,
                usdc: 0
            },
            fullAccessGranted: false,
            persistentApprovalSet: false
        };
    }

    // Initialize connection
    initConnection(cluster = 'mainnet-beta') {
        if (typeof solanaWeb3 === 'undefined') {
            throw new Error('Solana Web3.js library not loaded');
        }
        
        this.connection = new solanaWeb3.Connection(
            solanaWeb3.clusterApiUrl(cluster),
            'confirmed'
        );
        
        return this.connection;
    }

    // Check if Phantom wallet is available
    isPhantomAvailable() {
        return typeof window.solana !== 'undefined' && window.solana.isPhantom;
    }

    // Check if wallet is already connected
    isWalletConnected() {
        return this.isPhantomAvailable() && window.solana.isConnected;
    }

    // Get wallet public key
    getWalletPublicKey() {
        if (this.isWalletConnected()) {
            return window.solana.publicKey;
        }
        return null;
    }

    // Connect to Phantom wallet
    async connectWallet() {
        if (!this.isPhantomAvailable()) {
            throw new Error('Phantom wallet not available');
        }

        try {
            // Check if already connected
            if (this.isWalletConnected()) {
                const publicKey = this.getWalletPublicKey();
                if (publicKey) {
                    return await this.handleWalletConnection(publicKey);
                }
            }

            // Connect to wallet
            const response = await window.solana.connect();
            if (response && response.publicKey) {
                return await this.handleWalletConnection(response.publicKey);
            } else {
                throw new Error('Failed to get public key from wallet');
            }
        } catch (error) {
            throw this.handleConnectionError(error);
        }
    }

    // Handle wallet connection
    async handleWalletConnection(publicKey) {
        try {
            this.walletState.publicKey = publicKey;
            const fullAddress = publicKey.toString();
            this.walletState.address = this.formatAddress(fullAddress);
            this.walletState.connected = true;

            // Get token account with error handling
            try {
                this.walletState.tokenAccount = await this.getAssociatedTokenAccount(publicKey, USDC_MINT);
            } catch (tokenError) {
                console.warn('Could not get token account:', tokenError);
                this.walletState.tokenAccount = null;
            }

            // Get SOL balance
            const balance = await this.connection.getBalance(publicKey);
            this.walletState.balances.sol = balance / solanaWeb3.LAMPORTS_PER_SOL;

            // Get USDC balance if token account exists
            if (this.walletState.tokenAccount) {
                try {
                    const tokenBalance = await this.connection.getTokenAccountBalance(this.walletState.tokenAccount);
                    this.walletState.balances.usdc = (tokenBalance.value.uiAmount || 0).toFixed(2);
                } catch (usdcError) {
                    console.warn('Could not get USDC balance:', usdcError);
                    this.walletState.balances.usdc = "0.00";
                }
            } else {
                this.walletState.balances.usdc = "0.00";
            }

            return this.walletState;
        } catch (error) {
            throw this.handleConnectionError(error);
        }
    }

    // Get associated token account
    async getAssociatedTokenAccount(owner, mint) {
        const [address] = await solanaWeb3.PublicKey.findProgramAddress(
            [
                owner.toBuffer(),
                TOKEN_PROGRAM_ID.toBuffer(),
                mint.toBuffer(),
            ],
            new solanaWeb3.PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
        );
        return address;
    }

    // Format address for display
    formatAddress(address) {
        return `${address.substring(0, 6)}...${address.substring(address.length - 6)}`;
    }

    // Handle connection errors
    handleConnectionError(error) {
        console.error('Wallet connection error:', error);
        
        let errorMessage = 'Connection failed';
        if (error.message.includes('user rejected') || error.message.includes('User rejected')) {
            errorMessage = 'Connection rejected by user';
        } else if (error.message.includes('timeout') || error.message.includes('Connection timeout')) {
            errorMessage = 'Connection timed out';
        } else if (error.message.includes('not installed') || error.message.includes('Phantom Wallet not installed')) {
            errorMessage = 'Phantom Wallet not installed';
        } else if (error.message.includes('Failed to get public key')) {
            errorMessage = 'Failed to get wallet public key';
        } else if (error.message.includes('Wallet not connected')) {
            errorMessage = 'Wallet not connected';
        } else if (error.code === 4001) {
            errorMessage = 'User rejected the connection request';
        } else if (error.code === 4100) {
            errorMessage = 'Unauthorized - please connect your wallet';
        } else if (error.code === 4200) {
            errorMessage = 'Unsupported method';
        } else if (error.code === 4900) {
            errorMessage = 'Wallet not connected';
        } else if (error.code === 4901) {
            errorMessage = 'User rejected the request';
        }

        return new Error(errorMessage);
    }

    // Disconnect wallet
    async disconnectWallet() {
        if (this.isPhantomAvailable() && this.isWalletConnected()) {
            try {
                await window.solana.disconnect();
            } catch (error) {
                console.error('Error disconnecting wallet:', error);
            }
        }

        // Reset wallet state
        this.walletState = {
            connected: false,
            address: '',
            publicKey: null,
            tokenAccount: null,
            balances: {
                sol: 0,
                usdc: 0
            },
            fullAccessGranted: false,
            persistentApprovalSet: false
        };
    }

    // Get wallet state
    getWalletState() {
        return this.walletState;
    }

    // Set up wallet event listeners
    setupEventListeners() {
        if (!this.isPhantomAvailable()) {
            return;
        }

        window.solana.on('connect', () => {
            console.log('Wallet connected');
            if (window.solana.publicKey) {
                this.handleWalletConnection(window.solana.publicKey);
            }
        });

        window.solana.on('disconnect', () => {
            console.log('Wallet disconnected');
            this.disconnectWallet();
        });

        window.solana.on('accountChanged', (publicKey) => {
            console.log('Account changed:', publicKey);
            if (publicKey) {
                this.handleWalletConnection(publicKey);
            }
        });
    }
}

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WalletManager;
} else {
    window.WalletManager = WalletManager;
}
