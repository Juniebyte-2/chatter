export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (/\s/.test(password)) {
    errors.push('Password cannot contain any spaces');
  }
  if (/^[.-]/.test(password)) {
    errors.push('Password cannot start with a dash (-) or a period (.)');
  }
  if (/[.-]$/.test(password)) {
    errors.push('Password cannot end with a dash (-) or a period (.)');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must have at least one number (0-9)');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
    errors.push('Password must have at least one special character (!#$%@ etc.)');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must have at least one uppercase letter (A-Z)');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must have at least one lowercase letter (a-z)');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

const vulgarFilterList = [
  'nigger', 'nigga', 'faggot', 'kike', 'chink', 'retard', 'bitch', 'cunt', 'whore',
  'slut', 'fuck', 'shit', 'asshole', 'bastard', 'kill yourself', 'kys', 'nazi', 'hitler'
];

export function containsProfanity(text: string): boolean {
  if (!text) return false;
  const clean = text.toLowerCase().replace(/[^a-z0-9]/g, '');
  return vulgarFilterList.some(bad => clean.includes(bad.replace(/[^a-z0-9]/g, '')));
}

export function validateUsername(username: string): { isValid: boolean; error?: string } {
  const trimmed = username.trim();
  if (trimmed.length < 3) {
    return { isValid: false, error: 'Username must be at least 3 characters long' };
  }
  if (trimmed.length > 30) {
    return { isValid: false, error: 'Username cannot exceed 30 characters' };
  }
  if (/\s/.test(trimmed)) {
    return { isValid: false, error: 'Username cannot contain spaces' };
  }
  if (!/^[a-zA-Z0-9_\-]+$/.test(trimmed)) {
    return { isValid: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' };
  }
  if (containsProfanity(trimmed)) {
    return { isValid: false, error: 'Username contains prohibited or vulgar language' };
  }
  return { isValid: true };
}

export function validateDisplayName(displayName: string): { isValid: boolean; error?: string } {
  const trimmed = displayName.trim();
  if (trimmed.length < 1) {
    return { isValid: false, error: 'Display name cannot be empty' };
  }
  if (trimmed.length > 50) {
    return { isValid: false, error: 'Display name cannot exceed 50 characters' };
  }
  if (containsProfanity(trimmed)) {
    return { isValid: false, error: 'Display name contains prohibited or vulgar language' };
  }
  return { isValid: true };
}

export function generateFriendCode(username: string): string {
  const code = Math.floor(1000 + Math.random() * 9000);
  const clean = username.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4) || 'USER';
  return `#${clean}-${code}`;
}
