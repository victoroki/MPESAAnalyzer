import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';

interface DateRangePickerProps {
  startDate: Date;
  endDate: Date;
  onDateRangeChange: (startDate: Date, endDate: Date) => void;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onDateRangeChange,
}) => {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.dateRangeContainer}>
        <View style={styles.dateButton}>
          <Text style={styles.dateLabel}>From</Text>
          <Text style={styles.dateText}>{formatDate(startDate)}</Text>
        </View>
        
        <View style={styles.separator}>
          <Text style={styles.separatorText}>to</Text>
        </View>
        
        <View style={styles.dateButton}>
          <Text style={styles.dateLabel}>To</Text>
          <Text style={styles.dateText}>{formatDate(endDate)}</Text>
        </View>
      </View>
      
      <Text style={styles.infoText}>
        Date range functionality will be available in the full implementation
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  dateRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dateButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  separator: {
    marginHorizontal: 12,
  },
  separatorText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
  applyButton: {
    backgroundColor: '#0EA5E9',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default DateRangePicker;