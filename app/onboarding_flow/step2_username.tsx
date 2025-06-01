import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import KeyboardDismissWrapper from '@/components/KeyboardDismissWrapper';

// Password strength levels
type PasswordStrength = 'weak' | 'medium' | 'strong';

// Validation interfaces
interface ValidationResult {
  isValid: boolean;
  error?: string;
}

interface PasswordRequirements {
  minLength: boolean;
  hasNumber: boolean;
  hasUppercase: boolean;
  hasSpecialChar: boolean;
}

export default function Step2UsernameScreen() {
  const { user, saveOnboardingData, getOnboardingData } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength | null>(null);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [passwordRequirements, setPasswordRequirements] = useState<PasswordRequirements>({
    minLength: false,
    hasNumber: false,
    hasUppercase: false,
    hasSpecialChar: false,
  });

  // Load existing data
  useEffect(() => {
    const loadData = async () => {
      const data = await getOnboardingData();
      if (data.email) setEmail(data.email);
      if (data.password) setPassword(data.password);
    };
    loadData();
  }, [getOnboardingData]);

  // Email validation
  const validateEmail = (value: string): ValidationResult => {
    if (value.length === 0) {
      return { isValid: false };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return { isValid: false, error: 'Please enter a valid email address' };
    }
    return { isValid: true };
  };

  // Password validation
  const validatePassword = (value: string): ValidationResult => {
    if (value.length === 0) {
      return { isValid: false };
    }
    if (value.length < 6) {
      return { isValid: false, error: 'Password must be at least 6 characters' };
    }
    if (!/\d/.test(value)) {
      return { isValid: false, error: 'Password must contain at least one number' };
    }
    return { isValid: true };
  };

  // Check password requirements
  const checkPasswordRequirements = (value: string): PasswordRequirements => {
    return {
      minLength: value.length >= 6,
      hasNumber: /\d/.test(value),
      hasUppercase: /[A-Z]/.test(value),
      hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value),
    };
  };

  // Calculate password strength
  const calculatePasswordStrength = (value: string, requirements: PasswordRequirements): PasswordStrength | null => {
    if (value.length === 0) return null;
    
    let score = 0;
    if (requirements.minLength) score += 1;
    if (requirements.hasNumber) score += 1;
    if (requirements.hasUppercase) score += 1;
    if (requirements.hasSpecialChar) score += 1;
    if (value.length >= 8) score += 1;
    if (value.length >= 12) score += 1;

    if (score <= 2) return 'weak';
    if (score <= 4) return 'medium';
    return 'strong';
  };

  // Handle email change
  const handleEmailChange = (value: string) => {
    setEmail(value);
    const validation = validateEmail(value);
    setEmailError(validation.error || '');
  };

  // Handle password change
  const handlePasswordChange = (value: string) => {
    setPassword(value);
    const validation = validatePassword(value);
    const requirements = checkPasswordRequirements(value);
    const strength = calculatePasswordStrength(value, requirements);
    
    setPasswordError(validation.error || '');
    setPasswordRequirements(requirements);
    setPasswordStrength(strength);
  };

  // Handle password focus
  const handlePasswordFocus = () => {
    setIsPasswordFocused(true);
  };

  // Handle password blur
  const handlePasswordBlur = () => {
    setIsPasswordFocused(false);
  };

  const handleNext = async () => {
    // Save onboarding data
    await saveOnboardingData({
      email,
      password,
      step: 2
    });
    
    router.push('/onboarding_flow/step3_displayname');
  };

  const handleBack = () => {
    router.back();
  };

  // Check if form is valid
  const emailValid = validateEmail(email).isValid;
  const passwordValid = validatePassword(password).isValid;
  const isFormValid = emailValid && passwordValid;

  // TODO: remove before deploying - test navigation button
  const handleTestNext = () => {
    router.push('/onboarding_flow/step3_displayname');
  };

  // Password strength indicator component
  const PasswordStrengthIndicator = () => {
    if (!password) return null;

    const getStrengthColor = () => {
      switch (passwordStrength) {
        case 'weak': return '#FF4444';
        case 'medium': return '#FF8800';
        case 'strong': return '#44AA44';
        default: return '#CCCCCC';
      }
    };

    const getStrengthWidth = () => {
      switch (passwordStrength) {
        case 'weak': return '33%';
        case 'medium': return '66%';
        case 'strong': return '100%';
        default: return '0%';
      }
    };

    return (
      <View style={styles.strengthContainer}>
        <View style={styles.strengthBar}>
          <View 
            style={[
              styles.strengthFill, 
              { 
                width: getStrengthWidth(), 
                backgroundColor: getStrengthColor() 
              }
            ]} 
          />
        </View>
        <Text style={[styles.strengthText, { color: getStrengthColor() }]}>
          {passwordStrength ? passwordStrength.charAt(0).toUpperCase() + passwordStrength.slice(1) : ''}
        </Text>
      </View>
    );
  };

  // Password requirements checklist
  const PasswordRequirements = () => {
    if (!password) return null;

    const RequirementItem = ({ met, text }: { met: boolean; text: string }) => (
      <View style={styles.requirementItem}>
        <Text style={[styles.requirementIcon, { color: met ? '#44AA44' : '#CCCCCC' }]}>
          {met ? '✓' : '○'}
        </Text>
        <Text style={[styles.requirementText, { color: met ? '#44AA44' : '#666' }]}>
          {text}
        </Text>
      </View>
    );

    return (
      <View style={styles.requirementsContainer}>
        <RequirementItem met={passwordRequirements.minLength} text="At least 6 characters" />
        <RequirementItem met={passwordRequirements.hasNumber} text="Contains a number" />
        <RequirementItem met={passwordRequirements.hasUppercase} text="Contains uppercase letter" />
        <RequirementItem met={passwordRequirements.hasSpecialChar} text="Contains special character" />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>
      
      {/* TODO: remove before deploying - test navigation button */}
      <TouchableOpacity style={styles.testButton} onPress={handleTestNext}>
        <Text style={styles.testButtonText}>TEST →</Text>
      </TouchableOpacity>
      
      <KeyboardDismissWrapper>
        <View style={styles.contentContainer}>
          <View style={styles.content}>
            {/* Header - hide when password is focused */}
            <View style={[styles.header, isPasswordFocused && styles.hidden]}>
              <Text style={styles.welcomeText}>Welcome to</Text>
              <Text style={styles.title}>revue</Text>
              {user && (
                <Text style={styles.userInfo}>Logged in as: {user.email}</Text>
              )}
            </View>
            
            <View style={[styles.formContainer, isPasswordFocused && styles.focusedFormContainer]}>
              {/* Email field - hide when password is focused */}
              <View style={[styles.inputGroup, isPasswordFocused && styles.hidden]}>
                <Text style={styles.label}>Email:</Text>
                <TextInput
                  style={[
                    styles.input,
                    emailError ? styles.inputError : email && emailValid ? styles.inputValid : null
                  ]}
                  value={email}
                  onChangeText={handleEmailChange}
                  placeholder="Enter email"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  placeholderTextColor="#8B9A7D"
                />
                {emailError ? (
                  <Text style={styles.errorText}>{emailError}</Text>
                ) : email && emailValid ? (
                  <Text style={styles.successText}>✓ Email looks good</Text>
                ) : null}
              </View>
              
              {/* Password field - always rendered, centered when focused */}
              <View style={[styles.inputGroup, isPasswordFocused && styles.centeredInputGroup]}>
                <Text style={styles.label}>Password:</Text>
                <TextInput
                  style={[
                    styles.input,
                    passwordError ? styles.inputError : password && passwordValid ? styles.inputValid : null
                  ]}
                  value={password}
                  onChangeText={handlePasswordChange}
                  onFocus={handlePasswordFocus}
                  onBlur={handlePasswordBlur}
                  placeholder="Enter password"
                  secureTextEntry
                  placeholderTextColor="#8B9A7D"
                />
                {passwordError && (
                  <Text style={styles.errorText}>{passwordError}</Text>
                )}
                <PasswordStrengthIndicator />
                <PasswordRequirements />
              </View>
            </View>
          </View>
          
          {isFormValid && !isPasswordFocused && (
            <View style={styles.nextButtonContainer}>
              <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                <Text style={styles.nextButtonText}>Next</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardDismissWrapper>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F0',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 1,
    padding: 10,
  },
  backButtonText: {
    fontSize: 16,
    color: '#142D0A',
    fontFamily: 'LibreBaskerville_400Regular',
  },
  testButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 1,
    backgroundColor: '#FF6B6B',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  testButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 40,
    paddingTop: 80,
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  welcomeText: {
    fontSize: 18,
    color: '#142D0A',
    marginBottom: 5,
    fontFamily: 'LibreBaskerville_400Regular',
  },
  title: {
    fontSize: 48,
    color: '#142D0A',
    fontWeight: '300',
    fontFamily: 'LibreBaskerville_400Regular_Italic',
    marginBottom: 10,
  },
  userInfo: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'LibreBaskerville_400Regular_Italic',
  },
  formContainer: {
    gap: 30,
    marginBottom: 60,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    color: '#142D0A',
    fontFamily: 'LibreBaskerville_400Regular',
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 16,
    borderWidth: 1.84,
    borderColor: '#142D0A',
    color: '#142D0A',
    fontFamily: 'LibreBaskerville_400Regular',
  },
  inputError: {
    borderColor: '#FF4444',
  },
  inputValid: {
    borderColor: '#44AA44',
  },
  errorText: {
    fontSize: 12,
    color: '#FF4444',
    fontFamily: 'LibreBaskerville_400Regular',
    marginTop: 4,
  },
  successText: {
    fontSize: 12,
    color: '#44AA44',
    fontFamily: 'LibreBaskerville_400Regular',
    marginTop: 4,
  },
  strengthContainer: {
    marginTop: 8,
    gap: 4,
  },
  strengthBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontFamily: 'LibreBaskerville_400Regular',
    textAlign: 'right',
  },
  requirementsContainer: {
    marginTop: 8,
    gap: 4,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requirementIcon: {
    fontSize: 12,
    fontWeight: 'bold',
    width: 16,
  },
  requirementText: {
    fontSize: 11,
    fontFamily: 'LibreBaskerville_400Regular',
    flex: 1,
  },
  nextButtonContainer: {
    paddingHorizontal: 40,
    paddingBottom: 40,
    paddingTop: 20,
  },
  nextButton: {
    backgroundColor: '#142D0A',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.84,
    borderColor: '#142D0A',
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'LibreBaskerville_700Bold',
  },
  hidden: {
    opacity: 0,
    pointerEvents: 'none',
    position: 'absolute',
  },
  focusedFormContainer: {
    gap: 0,
    justifyContent: 'center',
    flex: 1,
    paddingBottom: 300, // Account for keyboard space
  },
  centeredInputGroup: {
    gap: 8,
    alignItems: 'stretch',
  },
});
