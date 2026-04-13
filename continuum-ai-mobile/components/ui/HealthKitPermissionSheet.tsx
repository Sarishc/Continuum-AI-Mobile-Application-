import React from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHealthKit } from '@/hooks/useHealthKit';

interface Props {
  visible: boolean;
  onClose: () => void;
  onGranted: () => void;
}

const DATA_TYPES = [
  { icon: '🩸', label: 'Blood Glucose',      desc: 'Track glucose trends over time' },
  { icon: '❤️', label: 'Heart Rate',          desc: 'Monitor cardiovascular health' },
  { icon: '💉', label: 'Blood Pressure',      desc: 'Track blood pressure patterns' },
  { icon: '⚖️', label: 'Weight & BMI',        desc: 'Track body composition' },
  { icon: '👣', label: 'Steps & Activity',    desc: 'Monitor daily movement' },
  { icon: '😴', label: 'Sleep Analysis',      desc: 'Track sleep quality' },
  { icon: '🫁', label: 'Oxygen Saturation',   desc: 'Monitor SpO2 levels' },
  { icon: '💓', label: 'Resting Heart Rate',  desc: 'Baseline cardiovascular fitness' },
];

export function HealthKitPermissionSheet({ visible, onClose, onGranted }: Props) {
  const insets = useSafeAreaInsets();
  const { requestPermission } = useHealthKit();
  const [isRequesting, setIsRequesting] = React.useState(false);

  if (Platform.OS !== 'ios') return null;

  const handleConnect = async () => {
    setIsRequesting(true);
    const granted = await requestPermission();
    setIsRequesting(false);
    if (granted) onGranted();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.72)',
      }}>
        <View style={{
          backgroundColor: '#0E0E0E',
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          borderTopWidth: 0.5,
          borderTopColor: 'rgba(255,255,255,0.12)',
          paddingBottom: insets.bottom + 16,
        }}>
          {/* Handle */}
          <View style={{
            width: 36, height: 4,
            backgroundColor: 'rgba(255,255,255,0.20)',
            borderRadius: 2,
            alignSelf: 'center',
            marginTop: 12,
            marginBottom: 24,
          }} />

          {/* Header */}
          <View style={{ paddingHorizontal: 24, marginBottom: 20 }}>
            <View style={{
              width: 64, height: 64,
              borderRadius: 16,
              backgroundColor: '#FF2D55',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 16,
            }}>
              <Text style={{ fontSize: 34 }}>❤️</Text>
            </View>

            <Text style={{
              fontSize: 24,
              fontWeight: '700',
              color: '#FFFFFF',
              marginBottom: 8,
            }}>
              Connect Apple Health
            </Text>

            <Text style={{
              fontSize: 15,
              color: 'rgba(255,255,255,0.55)',
              lineHeight: 22,
            }}>
              Continuum reads your health data to provide personalized AI insights.
              Your data never leaves your device without your permission.
            </Text>
          </View>

          {/* Data types */}
          <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
            {DATA_TYPES.map((item, i) => (
              <View key={i} style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 24,
                paddingVertical: 11,
                borderBottomWidth: 0.5,
                borderBottomColor: 'rgba(255,255,255,0.07)',
              }}>
                <Text style={{ fontSize: 22, width: 38 }}>{item.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '500', color: '#FFFFFF' }}>
                    {item.label}
                  </Text>
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginTop: 1 }}>
                    {item.desc}
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: '#30D158', fontWeight: '600' }}>Read</Text>
              </View>
            ))}
          </ScrollView>

          {/* Privacy note */}
          <Text style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.28)',
            textAlign: 'center',
            paddingHorizontal: 24,
            paddingTop: 14,
            lineHeight: 18,
          }}>
            🔒 Data is encrypted and only used to generate your insights
          </Text>

          {/* Buttons */}
          <View style={{ paddingHorizontal: 20, paddingTop: 16, gap: 10 }}>
            <Pressable
              onPress={handleConnect}
              disabled={isRequesting}
              style={({ pressed }) => ({
                backgroundColor: pressed ? '#3A7AEE' : '#4C8DFF',
                height: 52,
                borderRadius: 14,
                justifyContent: 'center',
                alignItems: 'center',
                flexDirection: 'row',
                gap: 8,
                opacity: isRequesting ? 0.7 : 1,
              })}
            >
              {isRequesting && <ActivityIndicator size="small" color="white" />}
              <Text style={{ fontSize: 17, fontWeight: '600', color: 'white' }}>
                {isRequesting ? 'Connecting...' : 'Connect Apple Health'}
              </Text>
            </Pressable>

            <Pressable
              onPress={onClose}
              style={{ height: 44, justifyContent: 'center', alignItems: 'center' }}
            >
              <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.38)' }}>Not now</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
