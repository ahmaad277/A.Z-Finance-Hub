import { AuthenticatedRequest } from '../middleware/auth';

export interface MaskingConfig {
  maskAbsoluteAmounts: boolean;
  maskSensitiveData: boolean;
  maskPersonalInfo: boolean;
}

export function getMaskingConfig(req: AuthenticatedRequest): MaskingConfig {
  const permissions = req.user?.permissions || [];
  
  return {
    // Basic Analysts can only see percentages, not absolute amounts
    maskAbsoluteAmounts: !permissions.includes('data:view_absolute_amounts'),
    
    // Hide sensitive financial details from lower roles
    maskSensitiveData: !permissions.includes('data:view_sensitive'),
    
    // Hide personal info from non-admin roles
    maskPersonalInfo: !permissions.includes('users:view_details'),
  };
}

export function maskInvestment(investment: any, config: MaskingConfig): any {
  const masked = { ...investment };

  if (config.maskAbsoluteAmounts) {
    // Replace absolute amounts with masked values
    masked.amount = '***';
    masked.expectedReturn = '***';
    masked.receivedAmount = masked.receivedAmount ? '***' : masked.receivedAmount;
  }

  if (config.maskSensitiveData) {
    masked.notes = masked.notes ? '[REDACTED]' : masked.notes;
  }

  return masked;
}

export function maskCashflow(cashflow: any, config: MaskingConfig): any {
  const masked = { ...cashflow };

  if (config.maskAbsoluteAmounts) {
    masked.amount = '***';
  }

  if (config.maskSensitiveData) {
    masked.notes = masked.notes ? '[REDACTED]' : masked.notes;
  }

  return masked;
}

export function maskCashTransaction(transaction: any, config: MaskingConfig): any {
  const masked = { ...transaction };

  if (config.maskAbsoluteAmounts) {
    masked.amount = '***';
  }

  if (config.maskSensitiveData) {
    masked.notes = masked.notes ? '[REDACTED]' : masked.notes;
  }

  return masked;
}

export function maskUser(user: any, config: MaskingConfig): any {
  const masked = { ...user };

  if (config.maskPersonalInfo) {
    masked.email = masked.email ? maskEmail(masked.email) : masked.email;
    masked.phone = masked.phone ? maskPhone(masked.phone) : masked.phone;
  }

  // Always remove password hash
  delete masked.passwordHash;

  return masked;
}

export function maskPortfolioStats(stats: any, config: MaskingConfig): any {
  const masked = { ...stats };

  if (config.maskAbsoluteAmounts) {
    masked.totalInvested = '***';
    masked.totalReturns = '***';
    masked.currentValue = '***';
    masked.upcomingCashflow = '***';
    masked.totalCashBalance = '***';
    masked.availableCash = '***';
    masked.reinvestedAmount = '***';
    // Keep percentages and ratios
    // masked.averageIrr, masked.averageDuration, etc. remain visible
  }

  return masked;
}

export function maskAnalyticsData(data: any, config: MaskingConfig): any {
  const masked = { ...data };

  if (config.maskAbsoluteAmounts) {
    // Mask monthly returns amounts but keep the structure
    masked.monthlyReturns = data.monthlyReturns?.map((item: any) => ({
      month: item.month,
      amount: '***',
    }));

    // Mask platform allocation amounts but keep percentages
    masked.platformAllocation = data.platformAllocation?.map((item: any) => ({
      platform: item.platform,
      amount: '***',
      percentage: item.percentage, // Keep percentage
    }));

    // Mask performance vs target amounts
    masked.performanceVsTarget = data.performanceVsTarget?.map((item: any) => ({
      year: item.year,
      actual: '***',
      target: '***',
    }));
  }

  return masked;
}

function maskEmail(email: string): string {
  const [username, domain] = email.split('@');
  if (!username || !domain) return email;
  
  const visibleChars = Math.min(2, Math.floor(username.length / 2));
  const masked = username.substring(0, visibleChars) + '***';
  return `${masked}@${domain}`;
}

function maskPhone(phone: string): string {
  if (phone.length <= 4) return '***';
  return '***' + phone.substring(phone.length - 4);
}

export function applyMasking(data: any, type: string, config: MaskingConfig): any {
  if (!data) return data;

  switch (type) {
    case 'investment':
      return Array.isArray(data) 
        ? data.map(item => maskInvestment(item, config))
        : maskInvestment(data, config);
    
    case 'cashflow':
      return Array.isArray(data)
        ? data.map(item => maskCashflow(item, config))
        : maskCashflow(data, config);
    
    case 'cash_transaction':
      return Array.isArray(data)
        ? data.map(item => maskCashTransaction(item, config))
        : maskCashTransaction(data, config);
    
    case 'user':
      return Array.isArray(data)
        ? data.map(item => maskUser(item, config))
        : maskUser(data, config);
    
    case 'portfolio_stats':
      return maskPortfolioStats(data, config);
    
    case 'analytics':
      return maskAnalyticsData(data, config);
    
    default:
      return data;
  }
}
