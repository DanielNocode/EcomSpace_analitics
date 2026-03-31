import React, { useState, useEffect } from 'react';
import {
  PlusCircle,
  User,
  CheckCircle,
  AlertCircle,
  Users,
  Calendar,
  DollarSign,
  MonitorPlay,
  Loader,
} from 'lucide-react';
import { manualApi } from '../lib/api';

interface FormState {
  loading: boolean;
  error: string | null;
  success: string | null;
}

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface Webinar {
  id: string;
  title: string;
  scheduledAt: string;
}

export default function DataEntry() {
  const [activeTab, setActiveTab] = useState<
    'contact' | 'registration' | 'attendance' | 'order' | 'webinar'
  >('contact');

  // Contact Form State
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '' });
  const [contactState, setContactState] = useState<FormState>({
    loading: false,
    error: null,
    success: null,
  });

  // Registration Form State
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [registrationForm, setRegistrationForm] = useState({
    contactId: '',
    webinarId: '',
    funnel: 'lead',
    utm_source: '',
    utm_medium: '',
  });
  const [registrationState, setRegistrationState] = useState<FormState>({
    loading: false,
    error: null,
    success: null,
  });
  const [contactSearch, setContactSearch] = useState('');

  // Attendance Form State
  const [attendanceForm, setAttendanceForm] = useState({
    contactId: '',
    webinarId: '',
    duration: '',
  });
  const [attendanceState, setAttendanceState] = useState<FormState>({
    loading: false,
    error: null,
    success: null,
  });

  // Order Form State
  const [orderForm, setOrderForm] = useState({
    contactId: '',
    amount: '',
    productName: '',
    webinarId: '',
  });
  const [orderState, setOrderState] = useState<FormState>({
    loading: false,
    error: null,
    success: null,
  });

  // Webinar Form State
  const [webinarForm, setWebinarForm] = useState({ title: '', scheduledAt: '' });
  const [webinarState, setWebinarState] = useState<FormState>({
    loading: false,
    error: null,
    success: null,
  });

  // Load contacts and webinars on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const contactsRes = await manualApi.getContacts(1, 1000, contactSearch);
        setContacts(contactsRes.data);
        const webinarsRes = await manualApi.getWebinars();
        setWebinars(webinarsRes);
      } catch (err) {
        console.error('Error loading data:', err);
      }
    };

    loadData();
  }, [contactSearch]);

  // Create Contact
  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactState({ loading: true, error: null, success: null });

    try {
      await manualApi.createContact(contactForm);
      setContactState({ loading: false, error: null, success: 'Контакт успешно создан!' });
      setContactForm({ name: '', email: '', phone: '' });
      setTimeout(() => setContactState({ ...contactState, success: null }), 3000);
    } catch (err: any) {
      setContactState({
        loading: false,
        error: err.message || 'Ошибка при создании контакта',
        success: null,
      });
    }
  };

  // Create Registration
  const handleCreateRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistrationState({ loading: true, error: null, success: null });

    try {
      await manualApi.createRegistration(registrationForm);
      setRegistrationState({
        loading: false,
        error: null,
        success: 'Регистрация успешно создана!',
      });
      setRegistrationForm({
        contactId: '',
        webinarId: '',
        funnel: 'lead',
        utm_source: '',
        utm_medium: '',
      });
      setTimeout(() => setRegistrationState({ ...registrationState, success: null }), 3000);
    } catch (err: any) {
      setRegistrationState({
        loading: false,
        error: err.message || 'Ошибка при создании регистрации',
        success: null,
      });
    }
  };

  // Create Attendance
  const handleCreateAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttendanceState({ loading: true, error: null, success: null });

    try {
      await manualApi.createAttendance({
        contactId: attendanceForm.contactId,
        webinarId: attendanceForm.webinarId,
        duration: parseInt(attendanceForm.duration),
      });
      setAttendanceState({
        loading: false,
        error: null,
        success: 'Посещение успешно создано!',
      });
      setAttendanceForm({ contactId: '', webinarId: '', duration: '' });
      setTimeout(() => setAttendanceState({ ...attendanceState, success: null }), 3000);
    } catch (err: any) {
      setAttendanceState({
        loading: false,
        error: err.message || 'Ошибка при создании посещения',
        success: null,
      });
    }
  };

  // Create Order
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderState({ loading: true, error: null, success: null });

    try {
      await manualApi.createOrder({
        contactId: orderForm.contactId,
        amount: parseFloat(orderForm.amount),
        productName: orderForm.productName,
        webinarId: orderForm.webinarId || undefined,
      });
      setOrderState({
        loading: false,
        error: null,
        success: 'Заказ успешно создан!',
      });
      setOrderForm({ contactId: '', amount: '', productName: '', webinarId: '' });
      setTimeout(() => setOrderState({ ...orderState, success: null }), 3000);
    } catch (err: any) {
      setOrderState({
        loading: false,
        error: err.message || 'Ошибка при создании заказа',
        success: null,
      });
    }
  };

  // Create Webinar
  const handleCreateWebinar = async (e: React.FormEvent) => {
    e.preventDefault();
    setWebinarState({ loading: true, error: null, success: null });

    try {
      await manualApi.createWebinar(webinarForm);
      setWebinarState({
        loading: false,
        error: null,
        success: 'Вебинар успешно создан!',
      });
      setWebinarForm({ title: '', scheduledAt: '' });
      setTimeout(() => setWebinarState({ ...webinarState, success: null }), 3000);
    } catch (err: any) {
      setWebinarState({
        loading: false,
        error: err.message || 'Ошибка при создании вебинара',
        success: null,
      });
    }
  };

  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(contactSearch.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
          <PlusCircle size={24} className="text-accent" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Ввод данных</h1>
          <p className="text-gray-400 text-sm">Ручное добавление контактов и события</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 bg-dark-800 p-1 rounded-lg border border-dark-600">
        <button
          onClick={() => setActiveTab('contact')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors font-medium text-sm ${
            activeTab === 'contact'
              ? 'bg-accent text-white'
              : 'text-gray-400 hover:text-white hover:bg-dark-700'
          }`}
        >
          <User size={16} />
          Новый контакт
        </button>
        <button
          onClick={() => setActiveTab('webinar')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors font-medium text-sm ${
            activeTab === 'webinar'
              ? 'bg-accent text-white'
              : 'text-gray-400 hover:text-white hover:bg-dark-700'
          }`}
        >
          <MonitorPlay size={16} />
          Новый вебинар
        </button>
        <button
          onClick={() => setActiveTab('registration')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors font-medium text-sm ${
            activeTab === 'registration'
              ? 'bg-accent text-white'
              : 'text-gray-400 hover:text-white hover:bg-dark-700'
          }`}
        >
          <Users size={16} />
          Новая регистрация
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors font-medium text-sm ${
            activeTab === 'attendance'
              ? 'bg-accent text-white'
              : 'text-gray-400 hover:text-white hover:bg-dark-700'
          }`}
        >
          <Calendar size={16} />
          Посещение
        </button>
        <button
          onClick={() => setActiveTab('order')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors font-medium text-sm ${
            activeTab === 'order'
              ? 'bg-accent text-white'
              : 'text-gray-400 hover:text-white hover:bg-dark-700'
          }`}
        >
          <DollarSign size={16} />
          Заказ
        </button>
      </div>

      {/* Forms Container */}
      <div className="max-w-2xl">
        {/* New Contact Form */}
        {activeTab === 'contact' && (
          <div className="card p-6 space-y-4">
            <h2 className="text-xl font-bold text-white mb-4">Новый контакт</h2>

            {contactState.error && (
              <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{contactState.error}</p>
              </div>
            )}

            {contactState.success && (
              <div className="flex items-start gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <CheckCircle size={20} className="text-green-500 flex-shrink-0 mt-0.5" />
                <p className="text-green-400 text-sm">{contactState.success}</p>
              </div>
            )}

            <form onSubmit={handleCreateContact} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Имя</label>
                <input
                  type="text"
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  required
                  className="input w-full"
                  placeholder="Иван Иванов"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  required
                  className="input w-full"
                  placeholder="ivan@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Телефон</label>
                <input
                  type="tel"
                  value={contactForm.phone}
                  onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                  required
                  className="input w-full"
                  placeholder="+7 (999) 123-45-67"
                />
              </div>

              <button
                type="submit"
                disabled={contactState.loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {contactState.loading ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Создание...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    Создать контакт
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* New Webinar Form */}
        {activeTab === 'webinar' && (
          <div className="card p-6 space-y-4">
            <h2 className="text-xl font-bold text-white mb-4">Новый вебинар</h2>

            {webinarState.error && (
              <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{webinarState.error}</p>
              </div>
            )}

            {webinarState.success && (
              <div className="flex items-start gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <CheckCircle size={20} className="text-green-500 flex-shrink-0 mt-0.5" />
                <p className="text-green-400 text-sm">{webinarState.success}</p>
              </div>
            )}

            <form onSubmit={handleCreateWebinar} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Название вебинара
                </label>
                <input
                  type="text"
                  value={webinarForm.title}
                  onChange={(e) => setWebinarForm({ ...webinarForm, title: e.target.value })}
                  required
                  className="input w-full"
                  placeholder="Как повысить продажи"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Дата и время
                </label>
                <input
                  type="datetime-local"
                  value={webinarForm.scheduledAt}
                  onChange={(e) =>
                    setWebinarForm({ ...webinarForm, scheduledAt: e.target.value })
                  }
                  required
                  className="input w-full"
                />
              </div>

              <button
                type="submit"
                disabled={webinarState.loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {webinarState.loading ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Создание...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    Создать вебинар
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* New Registration Form */}
        {activeTab === 'registration' && (
          <div className="card p-6 space-y-4">
            <h2 className="text-xl font-bold text-white mb-4">Новая регистрация</h2>

            {registrationState.error && (
              <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{registrationState.error}</p>
              </div>
            )}

            {registrationState.success && (
              <div className="flex items-start gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <CheckCircle size={20} className="text-green-500 flex-shrink-0 mt-0.5" />
                <p className="text-green-400 text-sm">{registrationState.success}</p>
              </div>
            )}

            <form onSubmit={handleCreateRegistration} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Контакт</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Поиск контакта..."
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    className="input w-full"
                  />
                  {contactSearch && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-dark-700 border border-dark-600 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                      {filteredContacts.map((contact) => (
                        <button
                          key={contact.id}
                          type="button"
                          onClick={() => {
                            setRegistrationForm({ ...registrationForm, contactId: contact.id });
                            setContactSearch('');
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-dark-600 text-gray-300 hover:text-white transition-colors text-sm"
                        >
                          {contact.name} ({contact.email})
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {registrationForm.contactId && (
                  <p className="text-xs text-gray-400 mt-2">
                    Выбран: {contacts.find((c) => c.id === registrationForm.contactId)?.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Вебинар</label>
                <select
                  value={registrationForm.webinarId}
                  onChange={(e) =>
                    setRegistrationForm({ ...registrationForm, webinarId: e.target.value })
                  }
                  required
                  className="input w-full"
                >
                  <option value="">Выберите вебинар</option>
                  {webinars.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Воронка продаж
                </label>
                <select
                  value={registrationForm.funnel}
                  onChange={(e) =>
                    setRegistrationForm({ ...registrationForm, funnel: e.target.value })
                  }
                  className="input w-full"
                >
                  <option value="lead">Lead</option>
                  <option value="prospect">Prospect</option>
                  <option value="customer">Customer</option>
                  <option value="vip">VIP</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    UTM Source
                  </label>
                  <input
                    type="text"
                    value={registrationForm.utm_source}
                    onChange={(e) =>
                      setRegistrationForm({ ...registrationForm, utm_source: e.target.value })
                    }
                    className="input w-full"
                    placeholder="google"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    UTM Medium
                  </label>
                  <input
                    type="text"
                    value={registrationForm.utm_medium}
                    onChange={(e) =>
                      setRegistrationForm({ ...registrationForm, utm_medium: e.target.value })
                    }
                    className="input w-full"
                    placeholder="cpc"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={registrationState.loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {registrationState.loading ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Создание...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    Создать регистрацию
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Attendance Form */}
        {activeTab === 'attendance' && (
          <div className="card p-6 space-y-4">
            <h2 className="text-xl font-bold text-white mb-4">Посещение вебинара</h2>

            {attendanceState.error && (
              <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{attendanceState.error}</p>
              </div>
            )}

            {attendanceState.success && (
              <div className="flex items-start gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <CheckCircle size={20} className="text-green-500 flex-shrink-0 mt-0.5" />
                <p className="text-green-400 text-sm">{attendanceState.success}</p>
              </div>
            )}

            <form onSubmit={handleCreateAttendance} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Контакт</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Поиск контакта..."
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    className="input w-full"
                  />
                  {contactSearch && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-dark-700 border border-dark-600 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                      {filteredContacts.map((contact) => (
                        <button
                          key={contact.id}
                          type="button"
                          onClick={() => {
                            setAttendanceForm({ ...attendanceForm, contactId: contact.id });
                            setContactSearch('');
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-dark-600 text-gray-300 hover:text-white transition-colors text-sm"
                        >
                          {contact.name} ({contact.email})
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {attendanceForm.contactId && (
                  <p className="text-xs text-gray-400 mt-2">
                    Выбран: {contacts.find((c) => c.id === attendanceForm.contactId)?.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Вебинар</label>
                <select
                  value={attendanceForm.webinarId}
                  onChange={(e) =>
                    setAttendanceForm({ ...attendanceForm, webinarId: e.target.value })
                  }
                  required
                  className="input w-full"
                >
                  <option value="">Выберите вебинар</option>
                  {webinars.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Продолжительность (минуты)
                </label>
                <input
                  type="number"
                  value={attendanceForm.duration}
                  onChange={(e) => setAttendanceForm({ ...attendanceForm, duration: e.target.value })}
                  required
                  min="0"
                  className="input w-full"
                  placeholder="45"
                />
              </div>

              <button
                type="submit"
                disabled={attendanceState.loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {attendanceState.loading ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Создание...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    Добавить посещение
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Order Form */}
        {activeTab === 'order' && (
          <div className="card p-6 space-y-4">
            <h2 className="text-xl font-bold text-white mb-4">Новый заказ</h2>

            {orderState.error && (
              <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{orderState.error}</p>
              </div>
            )}

            {orderState.success && (
              <div className="flex items-start gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <CheckCircle size={20} className="text-green-500 flex-shrink-0 mt-0.5" />
                <p className="text-green-400 text-sm">{orderState.success}</p>
              </div>
            )}

            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Контакт</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Поиск контакта..."
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    className="input w-full"
                  />
                  {contactSearch && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-dark-700 border border-dark-600 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                      {filteredContacts.map((contact) => (
                        <button
                          key={contact.id}
                          type="button"
                          onClick={() => {
                            setOrderForm({ ...orderForm, contactId: contact.id });
                            setContactSearch('');
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-dark-600 text-gray-300 hover:text-white transition-colors text-sm"
                        >
                          {contact.name} ({contact.email})
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {orderForm.contactId && (
                  <p className="text-xs text-gray-400 mt-2">
                    Выбран: {contacts.find((c) => c.id === orderForm.contactId)?.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Название продукта
                </label>
                <input
                  type="text"
                  value={orderForm.productName}
                  onChange={(e) => setOrderForm({ ...orderForm, productName: e.target.value })}
                  required
                  className="input w-full"
                  placeholder="Курс по маркетингу"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Сумма (руб.)
                </label>
                <input
                  type="number"
                  value={orderForm.amount}
                  onChange={(e) => setOrderForm({ ...orderForm, amount: e.target.value })}
                  required
                  min="0"
                  step="0.01"
                  className="input w-full"
                  placeholder="5990"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Вебинар (опционально)
                </label>
                <select
                  value={orderForm.webinarId}
                  onChange={(e) => setOrderForm({ ...orderForm, webinarId: e.target.value })}
                  className="input w-full"
                >
                  <option value="">Не выбран</option>
                  {webinars.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.title}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={orderState.loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {orderState.loading ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Создание...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    Создать заказ
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
