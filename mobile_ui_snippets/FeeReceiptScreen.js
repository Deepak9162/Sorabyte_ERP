import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {
  Download,
  Share2,
  Printer,
  CheckCircle,
  Calendar,
  CreditCard,
  Hash,
  Home,
  ChevronRight,
  User,
  Book,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

const FeeReceiptScreen = ({ data }) => {
  // Mock data if none provided
  const receipt = data || {
    studentName: 'Aryan Sharma',
    class: '8th',
    section: 'A',
    roll: '12',
    admissionNo: 'GWS1025',
    receiptNo: 'REC-548732',
    date: '15 Jan 2024',
    mode: 'UPI',
    txnId: 'TXN9876543210',
    total: 26000,
    breakdown: [
      { label: 'Tuition Fee', amount: 15000 },
      { label: 'Transport Fee', amount: 5000 },
      { label: 'Library Fee', amount: 2000 },
      { label: 'Exam Fee', amount: 3000 },
      { label: 'Other Charges', amount: 1000 },
    ],
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 1. Header Section */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.logoBox}>
              <Home size={24} color="#FFF" />
            </View>
            <Text style={styles.schoolName}>Sorabyte</Text>
          </View>
          <Text style={styles.receiptTitle}>Fee Payment Receipt</Text>
        </View>

        <View style={styles.content}>
          {/* 2. Student Details Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <User size={16} color="#6366F1" />
              <Text style={styles.cardHeaderText}>Student Details</Text>
            </View>
            <View style={styles.grid}>
              <View style={styles.gridItemFull}>
                <Text style={styles.label}>Student Name</Text>
                <Text style={styles.value}>{receipt.studentName}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Class</Text>
                <Text style={styles.value}>{receipt.class}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Section</Text>
                <Text style={styles.value}>{receipt.section}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Roll Number</Text>
                <Text style={styles.value}>{receipt.roll}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Admission No</Text>
                <Text style={styles.value}>{receipt.admissionNo}</Text>
              </View>
            </View>
          </View>

          {/* 3. Payment Details Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <CreditCard size={16} color="#6366F1" />
              <Text style={styles.cardHeaderText}>Payment Details</Text>
            </View>
            <View style={styles.paymentList}>
              <PaymentRow icon={Hash} label="Receipt No" value={receipt.receiptNo} />
              <PaymentRow icon={Calendar} label="Payment Date" value={receipt.date} />
              <PaymentRow icon={CreditCard} label="Payment Mode" value={receipt.mode} />
              <PaymentRow icon={ChevronRight} label="Transaction ID" value={receipt.txnId} />
            </View>
          </View>

          {/* 4. Fee Breakdown Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Book size={16} color="#6366F1" />
              <Text style={styles.cardHeaderText}>Fee Breakdown</Text>
            </View>
            <View style={styles.breakdownList}>
              {receipt.breakdown.map((item, idx) => (
                <View key={idx} style={styles.breakdownItem}>
                  <Text style={styles.breakdownLabel}>{item.label}</Text>
                  <Text style={styles.breakdownAmount}>₹ {item.amount.toLocaleString()}</Text>
                </View>
              ))}
            </View>
            <View style={styles.totalStrip}>
              <Text style={styles.totalLabel}>Total Amount Paid</Text>
              <Text style={styles.totalValue}>₹ {receipt.total.toLocaleString()}</Text>
            </View>
          </View>

          {/* 6. Payment Status Badge */}
          <View style={styles.statusRow}>
            <View style={styles.badge}>
              <CheckCircle size={16} color="#FFF" />
              <Text style={styles.badgeText}>Paid</Text>
            </View>
          </View>

          {/* 7. Action Buttons */}
          <View style={styles.actions}>
            <ActionButton icon={Download} label="PDF" />
            <ActionButton icon={Share2} label="Share" />
            <ActionButton icon={Printer} label="Print" />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const PaymentRow = ({ icon: Icon, label, value }) => (
  <View style={styles.paymentRow}>
    <View style={styles.paymentLabelBox}>
      <Icon size={14} color="#94A3B8" />
      <Text style={styles.paymentLabel}>{label}</Text>
    </View>
    <Text style={styles.paymentValue}>{value}</Text>
  </View>
);

const ActionButton = ({ icon: Icon, label }) => (
  <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
    <Icon size={20} color="#6366F1" />
    <Text style={styles.actionText}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFF',
    paddingVertical: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoBox: {
    width: 36,
    height: 36,
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  schoolName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  receiptTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    paddingBottom: 8,
  },
  cardHeaderText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    width: '50%',
    marginBottom: 16,
  },
  gridItemFull: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  paymentList: {
    gap: 12,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentLabelBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    marginLeft: 10,
  },
  paymentValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  breakdownList: {
    gap: 12,
    marginBottom: 20,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  breakdownLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  breakdownAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  totalStrip: {
    backgroundColor: '#10B981',
    marginHorizontal: -20,
    marginBottom: -20,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  totalLabel: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
    opacity: 0.9,
  },
  totalValue: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
  },
  statusRow: {
    alignItems: 'center',
    marginVertical: 12,
  },
  badge: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 30,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginLeft: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1E293B',
    textTransform: 'uppercase',
    marginTop: 6,
  },
});

export default FeeReceiptScreen;
