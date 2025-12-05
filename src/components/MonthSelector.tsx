import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
// @ts-ignore
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface MonthSelectorProps {
    selectedDate: Date;
    onSelectDate: (date: Date) => void;
}

const MonthSelector: React.FC<MonthSelectorProps> = ({ selectedDate, onSelectDate }) => {
    const months = [];
    const now = new Date();

    // Generate last 12 months
    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(d);
    }

    const isSelected = (date: Date) => {
        return date.getMonth() === selectedDate.getMonth() &&
            date.getFullYear() === selectedDate.getFullYear();
    };

    const formatMonth = (date: Date) => {
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };

    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {months.map((date, index) => (
                    <TouchableOpacity
                        key={index}
                        style={[
                            styles.monthChip,
                            isSelected(date) && styles.selectedChip
                        ]}
                        onPress={() => onSelectDate(date)}
                    >
                        <Text style={[
                            styles.monthText,
                            isSelected(date) && styles.selectedText
                        ]}>
                            {formatMonth(date)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 60,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    scrollContent: {
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    monthChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
        backgroundColor: '#f5f5f5',
    },
    selectedChip: {
        backgroundColor: '#007AFF', // Primary color
    },
    monthText: {
        color: '#666',
        fontWeight: '600',
    },
    selectedText: {
        color: '#fff',
    },
});

export default MonthSelector;
