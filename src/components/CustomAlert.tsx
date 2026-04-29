import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors } from '../constants';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  buttons?: AlertButton[];
  icon?: string;
  iconColor?: string;
  onDismiss?: () => void;
}

const CustomAlert: React.FC<CustomAlertProps> = ({
  visible,
  title,
  message,
  buttons = [{ text: 'OK', style: 'default' }],
  icon,
  iconColor,
  onDismiss,
}) => {
  const scaleAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible, scaleAnim]);

  const handleButtonPress = (button: AlertButton) => {
    if (button.onPress) {
      button.onPress();
    }
    if (onDismiss) {
      onDismiss();
    }
  };

  const getButtonStyle = (style?: string) => {
    switch (style) {
      case 'cancel':
        return styles.cancelButton;
      case 'destructive':
        return styles.destructiveButton;
      default:
        return styles.defaultButton;
    }
  };

  const getButtonTextStyle = (style?: string) => {
    switch (style) {
      case 'cancel':
        return styles.cancelButtonText;
      case 'destructive':
        return styles.destructiveButtonText;
      default:
        return styles.defaultButtonText;
    }
  };

  const getIconColor = () => {
    if (iconColor) return iconColor;
    if (buttons.some(b => b.style === 'destructive')) return '#EF4444';
    return Colors.primary;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.alertContainer,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Icon */}
          {icon && (
            <View style={[styles.iconContainer, { backgroundColor: getIconColor() + '15' }]}>
              <Icon name={icon} size={48} color={getIconColor()} />
            </View>
          )}

          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Message */}
          <Text style={styles.message}>{message}</Text>

          {/* Buttons */}
          <View style={styles.buttonsContainer}>
            {buttons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.button,
                  getButtonStyle(button.style),
                  buttons.length === 1 && styles.singleButton,
                ]}
                onPress={() => handleButtonPress(button)}
                activeOpacity={0.8}
              >
                <Text style={getButtonTextStyle(button.style)}>
                  {button.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  alertContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonsContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  singleButton: {
    flex: 1,
  },
  defaultButton: {
    backgroundColor: Colors.primary,
  },
  cancelButton: {
    backgroundColor: Colors.secondary,
  },
  destructiveButton: {
    backgroundColor: '#EF4444',
  },
  defaultButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  destructiveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

// Hook for using custom alerts
export const useCustomAlert = () => {
  const [alertConfig, setAlertConfig] = React.useState<{
    visible: boolean;
    title: string;
    message: string;
    buttons?: AlertButton[];
    icon?: string;
    iconColor?: string;
  }>({
    visible: false,
    title: '',
    message: '',
  });

  const isShowingRef = React.useRef(false);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const showAlert = React.useCallback((
    title: string,
    message: string,
    buttons?: AlertButton[],
    icon?: string,
    iconColor?: string,
  ) => {
    // Prevent multiple alerts from showing at once
    if (isShowingRef.current) {
      return;
    }

    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    isShowingRef.current = true;
    setAlertConfig({
      visible: true,
      title,
      message,
      buttons,
      icon,
      iconColor,
    });

    // Reset the flag after a short delay to allow the alert to render
    timeoutRef.current = setTimeout(() => {
      isShowingRef.current = false;
    }, 500);
  }, []);

  const hideAlert = React.useCallback(() => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
    // Reset the flag when hiding
    setTimeout(() => {
      isShowingRef.current = false;
    }, 300);
  }, []);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const AlertComponent = React.useCallback(() => (
    <CustomAlert
      visible={alertConfig.visible}
      title={alertConfig.title}
      message={alertConfig.message}
      buttons={alertConfig.buttons}
      icon={alertConfig.icon}
      iconColor={alertConfig.iconColor}
      onDismiss={hideAlert}
    />
  ), [alertConfig, hideAlert]);

  return { showAlert, AlertComponent };
};

export default CustomAlert;
