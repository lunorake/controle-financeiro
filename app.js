import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  SafeAreaView,
  StatusBar,
  Share
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@finance_data_v1';

const INITIAL_DATA = {
  transactions: [],
  reserveGoal: 5000,
  reserveCurrent: 0,
};

export default function App() {
  const [data, setData] = useState(INITIAL_DATA);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'transactions', 'goals'
  
  // Modal Estados
  const [modalVisible, setModalVisible] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense'); // 'income' | 'expense'
  const [accountType, setAccountType] = useState('money'); // 'money' | 'vr' | 'va' | 'card'
  const [category, setCategory] = useState('Geral');
  
  // Aporte Meta
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [goalAmount, setGoalAmount] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    saveData();
  }, [data]);

  const saveData = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Erro ao salvar dados', e);
    }
  };

  const loadData = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
      if (jsonValue != null) {
        setData(JSON.parse(jsonValue));
      }
    } catch (e) {
      console.error('Erro ao carregar dados', e);
    }
  };

  // Cálculos Financeiros
  const getBalance = (accType = 'money') => {
    return data.transactions
      .filter((t) => t.accountType === accType)
      .reduce((acc, t) => (t.type === 'income' ? acc + t.amount : acc - t.amount), 0);
  };

  const moneyBalance = getBalance('money');
  const vrBalance = getBalance('vr');
  const vaBalance = getBalance('va');

  const totalExpensesMonth = data.transactions
    .filter((t) => t.type === 'expense' && t.accountType === 'money')
    .reduce((acc, t) => acc + t.amount, 0);

  // Limite semanal dinâmico (base em 4 semanas)
  const weeklyLimit = Math.max(0, (moneyBalance / 4)).toFixed(2);

  const addTransaction = () => {
    if (!description || !amount || isNaN(Number(amount))) {
      Alert.alert('Erro', 'Informe descrição e valor válidos.');
      return;
    }

    const newTransaction = {
      id: Date.now().toString(),
      description,
      amount: parseFloat(amount),
      type,
      accountType,
      category,
      date: new Date().toLocaleDateString('pt-BR'),
    };

    setData((prev) => ({
      ...prev,
      transactions: [newTransaction, ...prev.transactions],
    }));

    setDescription('');
    setAmount('');
    setModalVisible(false);
  };

  const addGoalContribution = () => {
    const val = parseFloat(goalAmount);
    if (!goalAmount || isNaN(val)) {
      Alert.alert('Erro', 'Informe um valor válido.');
      return;
    }

    setData((prev) => ({
      ...prev,
      reserveCurrent: prev.reserveCurrent + val,
    }));

    setGoalAmount('');
    setGoalModalVisible(false);
  };

  const exportBackup = async () => {
    try {
      const json = JSON.stringify(data, null, 2);
      await Share.share({
        message: json,
        title: 'Backup Controle Financeiro',
      });
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível exportar o backup.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121214" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Controle Financeiro</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {activeTab === 'dashboard' && (
          <>
            {/* Cards de Saldo */}
            <View style={styles.cardMain}>
              <Text style={styles.cardLabel}>Saldo Disponível (Dinheiro/Conta)</Text>
              <Text style={styles.cardValueLarge}>
                R$ {moneyBalance.toFixed(2)}
              </Text>
            </View>

            {/* Benefícios Separados */}
            <View style={styles.row}>
              <View style={[styles.cardSmall, { backgroundColor: '#1E293B' }]}>
                <Text style={styles.cardLabel}>Vale Refeição (VR)</Text>
                <Text style={styles.cardValue}>R$ {vrBalance.toFixed(2)}</Text>
              </View>

              <View style={[styles.cardSmall, { backgroundColor: '#1E293B' }]}>
                <Text style={styles.cardLabel}>Vale Alimentação (VA)</Text>
                <Text style={styles.cardValue}>R$ {vaBalance.toFixed(2)}</Text>
              </View>
            </View>

            {/* Limite Semanal Calculado */}
            <View style={styles.cardInfo}>
              <Text style={styles.cardInfoTitle}>💡 Limite Semanal Sugerido</Text>
              <Text style={styles.cardInfoValue}>R$ {weeklyLimit} / semana</Text>
              <Text style={styles.cardInfoSub}>
                Calculado com base no seu saldo total disponível dividido por 4 semanas.
              </Text>
            </View>

            {/* Resumo da Meta */}
            <View style={styles.cardGoal}>
              <Text style={styles.cardLabel}>Reserva de Emergência</Text>
              <Text style={styles.goalText}>
                R$ {data.reserveCurrent.toFixed(2)} / R$ {data.reserveGoal.toFixed(2)}
              </Text>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${Math.min(100, (data.reserveCurrent / data.reserveGoal) * 100)}%` },
                  ]}
                />
              </View>
            </View>
          </>
        )}

        {activeTab === 'transactions' && (
          <View>
            <Text style={styles.sectionTitle}>Histórico de Lançamentos</Text>
            {data.transactions.length === 0 ? (
              <Text style={styles.emptyText}>Nenhum lançamento cadastrado.</Text>
            ) : (
              data.transactions.map((t) => (
                <View key={t.id} style={styles.transactionItem}>
                  <View>
                    <Text style={styles.tDescription}>{t.description}</Text>
                    <Text style={styles.tSub}>
                      {t.category} • {t.accountType.toUpperCase()} • {t.date}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.tAmount,
                      { color: t.type === 'income' ? '#4ADE80' : '#F87171' },
                    ]}
                  >
                    {t.type === 'income' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'goals' && (
          <View>
            <Text style={styles.sectionTitle}>Meta: Reserva de Emergência</Text>
            <View style={styles.cardGoal}>
              <Text style={styles.cardLabel}>Objetivo: R$ 5.000,00</Text>
              <Text style={styles.goalText}>
                Atual: R$ {data.reserveCurrent.toFixed(2)}
              </Text>
              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={() => setGoalModalVisible(true)}
              >
                <Text style={styles.btnText}>Adicionar Aporte</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Backup de Dados</Text>
            <TouchableOpacity style={styles.btnSecondary} onPress={exportBackup}>
              <Text style={styles.btnTextSecondary}>Exportar / Compartilhar Backup</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Botão Flutuante de Adicionar */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Navegação Inferior */}
      <View style={styles.navbar}>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('dashboard')}>
          <Text style={[styles.navText, activeTab === 'dashboard' && styles.navActive]}>Início</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('transactions')}>
          <Text style={[styles.navText, activeTab === 'transactions' && styles.navActive]}>Extrato</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('goals')}>
          <Text style={[styles.navText, activeTab === 'goals' && styles.navActive]}>Metas/Backup</Text>
        </TouchableOpacity>
      </View>

      {/* Modal Lançamento */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Novo Lançamento</Text>

            <TextInput
              style={styles.input}
              placeholder="Descrição (ex: Mercado, Salário)"
              placeholderTextColor="#94A3B8"
              value={description}
              onChangeText={setDescription}
            />

            <TextInput
              style={styles.input}
              placeholder="Valor (ex: 150.00)"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />

            <Text style={styles.label}>Tipo:</Text>
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.chip, type === 'expense' && styles.chipActive]}
                onPress={() => setType('expense')}
              >
                <Text style={styles.chipText}>Despesa</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chip, type === 'income' && styles.chipActive]}
                onPress={() => setType('income')}
              >
                <Text style={styles.chipText}>Receita</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Conta / Carteira:</Text>
            <View style={styles.rowWrap}>
              {['money', 'vr', 'va', 'card'].map((acc) => (
                <TouchableOpacity
                  key={acc}
                  style={[styles.chip, accountType === acc && styles.chipActive]}
                  onPress={() => setAccountType(acc)}
                >
                  <Text style={styles.chipText}>{acc.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.btnCancel}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.btnTextSecondary}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnPrimary} onPress={addTransaction}>
                <Text style={styles.btnText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Aporte Meta */}
      <Modal visible={goalModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Novo Aporte na Reserva</Text>
            <TextInput
              style={styles.input}
              placeholder="Valor do Aporte (ex: 200.00)"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={goalAmount}
              onChangeText={setGoalAmount}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.btnCancel}
                onPress={() => setGoalModalVisible(false)}
              >
                <Text style={styles.btnTextSecondary}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnPrimary} onPress={addGoalContribution}>
                <Text style={styles.btnText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { padding: 16, backgroundColor: '#1E293B', alignItems: 'center' },
  headerTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: 'bold' },
  content: { padding: 16, paddingBottom: 80 },
  cardMain: {
    backgroundColor: '#3B82F6',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
  },
  cardSmall: { flex: 1, padding: 16, borderRadius: 12, marginHorizontal: 4 },
  cardLabel: { color: '#94A3B8', fontSize: 12, marginBottom: 4 },
  cardValueLarge: { color: '#FFF', fontSize: 28, fontWeight: 'bold' },
  cardValue: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  cardInfo: {
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
    marginVertical: 12,
  },
  cardInfoTitle: { color: '#FCD34D', fontSize: 14, fontWeight: 'bold' },
  cardInfoValue: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginVertical: 4 },
  cardInfoSub: { color: '#94A3B8', fontSize: 12 },
  cardGoal: { backgroundColor: '#1E293B', padding: 16, borderRadius: 12, marginTop: 8 },
  goalText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  progressBarBg: { height: 8, backgroundColor: '#334155', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#22C55E' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 },
  sectionTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  transactionItem: {
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tDescription: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  tSub: { color: '#94A3B8', fontSize: 11 },
  tAmount: { fontSize: 14, fontWeight: 'bold' },
  emptyText: { color: '#64748B', textAlign: 'center', marginTop: 20 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 70,
    backgroundColor: '#22C55E',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  fabText: { color: '#FFF', fontSize: 28, fontWeight: 'bold' },
  navbar: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    height: 56,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  navItem: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  navText: { color: '#94A3B8', fontSize: 12 },
  navActive: { color: '#3B82F6', fontWeight: 'bold' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContainer: { backgroundColor: '#1E293B', borderRadius: 12, padding: 20 },
  modalTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  input: {
    backgroundColor: '#0F172A',
    color: '#FFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  label: { color: '#94A3B8', fontSize: 12, marginTop: 8, marginBottom: 4 },
  chip: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
  },
  chipActive: { backgroundColor: '#3B82F6' },
  chipText: { color: '#FFF', fontSize: 12 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, gap: 12 },
  btnPrimary: { backgroundColor: '#22C55E', padding: 12, borderRadius: 8, alignItems: 'center' },
  btnSecondary: { backgroundColor: '#334155', padding: 12, borderRadius: 8, alignItems: 'center' },
  btnCancel: { padding: 12, borderRadius: 8 },
  btnText: { color: '#FFF', fontWeight: 'bold' },
  btnTextSecondary: { color: '#94A3B8', fontWeight: 'bold' },
});
