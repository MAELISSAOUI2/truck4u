'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { rideApi } from '@/lib/api';
import {
  MapPin,
  Package,
  Calendar,
  Clock,
  TruckIcon,
  ArrowRight,
  Upload,
  X,
  Users,
  AlertCircle,
  Check,
} from 'lucide-react';
import Image from 'next/image';

const VEHICLE_TYPES = [
  {
    value: 'PICKUP',
    label: 'Pickup',
    capacity: '500 kg',
    dimensions: '1.5m × 1.5m',
    price: 15,
    icon: '🚙',
    description: 'Idéal pour petits colis et cartons',
  },
  {
    value: 'VAN',
    label: 'Camionnette',
    capacity: '1 tonne',
    dimensions: '2m × 1.8m × 1.8m',
    price: 25,
    icon: '🚐',
    description: 'Parfait pour déménagements d\'appartement',
  },
  {
    value: 'SMALL_TRUCK',
    label: 'Petit Camion',
    capacity: '3 tonnes',
    dimensions: '4m × 2m × 2m',
    price: 45,
    icon: '🚚',
    description: 'Pour grandes quantités de marchandises',
  },
  {
    value: 'MEDIUM_TRUCK',
    label: 'Camion Moyen',
    capacity: '8 tonnes',
    dimensions: '6m × 2.4m × 2.4m',
    price: 85,
    icon: '🚛',
    description: 'Transport professionnel et industriel',
  },
  {
    value: 'LARGE_TRUCK',
    label: 'Grand Camion',
    capacity: '20 tonnes',
    dimensions: '8m × 2.4m × 2.6m',
    price: 150,
    icon: '🚚',
    description: 'Gros volumes et charges lourdes',
  },
];

export default function NewRidePage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [estimate, setEstimate] = useState<any>(null);
  const [error, setError] = useState('');
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState({
    pickupAddress: '',
    pickupLat: 36.8065,
    pickupLng: 10.1815,
    deliveryAddress: '',
    deliveryLat: 0,
    deliveryLng: 0,
    vehicleType: 'VAN',
    cargoDescription: '',
    cargoWeight: '',
    numberOfTrips: 1,
    numberOfHelpers: 0,
    scheduledDate: '',
    scheduledTime: '',
    isUrgent: false,
    needsHelper: false,
  });

  useEffect(() => {
    if (!token) {
      router.push('/customer/login');
    }
  }, [token]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setUploadedPhotos((prev) => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removePhoto = (index: number) => {
    setUploadedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const calculateEstimate = () => {
    const vehicle = VEHICLE_TYPES.find((v) => v.value === formData.vehicleType);
    if (!vehicle) return null;

    // Algorithme d'estimation réaliste
    const basePrice = vehicle.price;
    const distance = 15; // km (à remplacer par calcul réel avec l'API)
    const distancePrice = distance * 1.5; // 1.5 DT/km
    
    // Facteurs multiplicateurs
    const weightFactor = formData.cargoWeight ? Math.max(1, parseInt(formData.cargoWeight) / 100) : 1;
    const tripsFactor = formData.numberOfTrips;
    const helpersCost = formData.numberOfHelpers * 15; // 15 DT par helper
    const urgentFactor = formData.isUrgent ? 1.2 : 1;
    
    const subtotal = (basePrice + distancePrice) * weightFactor * tripsFactor * urgentFactor;
    const total = Math.round(subtotal + helpersCost);

    return {
      basePrice,
      distancePrice: Math.round(distancePrice),
      helpersCost,
      urgentSurcharge: formData.isUrgent ? Math.round(subtotal * 0.2) : 0,
      estimatedPrice: total,
      distance,
      duration: Math.round(distance * 3 + 15), // 3 min/km + 15 min chargement
    };
  };

  const handleEstimate = () => {
    if (!formData.pickupAddress || !formData.deliveryAddress || !formData.vehicleType) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setError('');
    setEstimating(true);

    setTimeout(() => {
      const calc = calculateEstimate();
      setEstimate(calc);
      setEstimating(false);
      setCurrentStep(3);
    }, 1000);
  };

  const handleCreateRide = async () => {
    if (!estimate) {
      setError('Veuillez d\'abord obtenir une estimation');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await rideApi.create({
        ...formData,
        deliveryLat: formData.deliveryLat || formData.pickupLat + 0.1,
        deliveryLng: formData.deliveryLng || formData.pickupLng + 0.1,
        estimatedPrice: estimate.estimatedPrice,
        estimatedDistance: estimate.distance,
        estimatedDuration: estimate.duration,
        photos: uploadedPhotos,
      });

      router.push(`/customer/rides/${response.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la création de la course');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/customer/dashboard')}
              className="flex items-center text-gray-600 hover:text-gray-900 transition"
            >
              <ArrowRight className="h-5 w-5 mr-2 rotate-180" />
              <span className="font-medium">Retour</span>
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Nouvelle Course</h1>
            <div className="w-24"></div>
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-center space-x-4">
          {[
            { num: 1, label: 'Adresses' },
            { num: 2, label: 'Détails' },
            { num: 3, label: 'Confirmation' },
          ].map((step) => (
            <div key={step.num} className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold ${
                  currentStep >= step.num
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {currentStep > step.num ? <Check className="h-5 w-5" /> : step.num}
              </div>
              <span
                className={`ml-2 text-sm font-medium ${
                  currentStep >= step.num ? 'text-gray-900' : 'text-gray-500'
                }`}
              >
                {step.label}
              </span>
              {step.num < 3 && (
                <div
                  className={`w-12 h-1 mx-4 rounded ${
                    currentStep > step.num ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                ></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Addresses */}
            {currentStep === 1 && (
              <div className="space-y-6">
                {/* Map Placeholder */}
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold mb-4">Carte interactive</h3>
                  <div className="aspect-video bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl flex items-center justify-center border-2 border-dashed border-blue-300">
                    <div className="text-center">
                      <MapPin className="h-12 w-12 text-blue-600 mx-auto mb-2" />
                      <p className="text-blue-600 font-medium">
                        Carte interactive (Google Maps / Leaflet)
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Sélectionnez les points de départ et d'arrivée
                      </p>
                    </div>
                  </div>
                </div>

                {/* Pickup Address */}
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    <MapPin className="inline h-5 w-5 mr-2 text-green-600" />
                    Adresse de départ *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.pickupAddress}
                    onChange={(e) => setFormData({ ...formData, pickupAddress: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="Ex: Avenue Habib Bourguiba, Tunis"
                  />
                </div>

                {/* Delivery Address */}
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    <MapPin className="inline h-5 w-5 mr-2 text-red-600" />
                    Adresse de livraison *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.deliveryAddress}
                    onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="Ex: Zone Industrielle, Sousse"
                  />
                </div>

                <button
                  onClick={() => setCurrentStep(2)}
                  disabled={!formData.pickupAddress || !formData.deliveryAddress}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-indigo-700 transition disabled:opacity-50 shadow-lg"
                >
                  Continuer
                </button>
              </div>
            )}

            {/* Step 2: Details */}
            {currentStep === 2 && (
              <div className="space-y-6">
                {/* Vehicle Type */}
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold mb-4">Type de véhicule *</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {VEHICLE_TYPES.map((vehicle) => (
                      <button
                        key={vehicle.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, vehicleType: vehicle.value })}
                        className={`p-4 border-2 rounded-xl transition text-left ${
                          formData.vehicleType === vehicle.value
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <span className="text-4xl">{vehicle.icon}</span>
                          <div className="flex-1">
                            <div className="font-bold text-gray-900">{vehicle.label}</div>
                            <div className="text-xs text-gray-600 mt-1">{vehicle.capacity}</div>
                            <div className="text-xs text-gray-500">{vehicle.dimensions}</div>
                            <div className="text-sm text-blue-600 font-semibold mt-2">
                              À partir de {vehicle.price} DT
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 mt-3">{vehicle.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cargo Details */}
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold mb-4">
                    <Package className="inline h-5 w-5 mr-2" />
                    Détails de la marchandise
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description *
                      </label>
                      <textarea
                        required
                        value={formData.cargoDescription}
                        onChange={(e) =>
                          setFormData({ ...formData, cargoDescription: e.target.value })
                        }
                        rows={3}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        placeholder="Ex: 20 cartons de produits alimentaires"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Poids (kg)
                        </label>
                        <input
                          type="number"
                          value={formData.cargoWeight}
                          onChange={(e) =>
                            setFormData({ ...formData, cargoWeight: e.target.value })
                          }
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                          placeholder="500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nombre de voyages
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={formData.numberOfTrips}
                          onChange={(e) =>
                            setFormData({ ...formData, numberOfTrips: parseInt(e.target.value) || 1 })
                          }
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Photos Upload */}
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold mb-4">
                    <Upload className="inline h-5 w-5 mr-2" />
                    Photos des articles (optionnel)
                  </h3>
                  <div className="space-y-4">
                    <label className="block cursor-pointer">
                      <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-500 transition">
                        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600 font-medium">
                          Cliquez pour ajouter des photos
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          PNG, JPG jusqu'à 10MB
                        </p>
                      </div>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>

                    {uploadedPhotos.length > 0 && (
                      <div className="grid grid-cols-3 gap-4">
                        {uploadedPhotos.map((photo, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={photo}
                              alt={`Upload ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg"
                            />
                            <button
                              onClick={() => removePhoto(index)}
                              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Helpers */}
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold mb-4">
                    <Users className="inline h-5 w-5 mr-2" />
                    Nombre de convoyeurs
                  </h3>
                  <div className="flex items-center space-x-4">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          numberOfHelpers: Math.max(0, formData.numberOfHelpers - 1),
                        })
                      }
                      className="w-12 h-12 bg-gray-100 rounded-xl font-bold text-xl hover:bg-gray-200 transition"
                    >
                      −
                    </button>
                    <div className="flex-1 text-center">
                      <p className="text-3xl font-bold text-gray-900">{formData.numberOfHelpers}</p>
                      <p className="text-sm text-gray-600">convoyeur(s)</p>
                      <p className="text-xs text-blue-600 font-medium mt-1">
                        {formData.numberOfHelpers * 15} DT
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          numberOfHelpers: formData.numberOfHelpers + 1,
                        })
                      }
                      className="w-12 h-12 bg-blue-600 text-white rounded-xl font-bold text-xl hover:bg-blue-700 transition"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Options */}
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold mb-4">Options</h3>
                  <div className="space-y-3">
                    <label className="flex items-start p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-blue-500 transition">
                      <input
                        type="checkbox"
                        checked={formData.isUrgent}
                        onChange={(e) => setFormData({ ...formData, isUrgent: e.target.checked })}
                        className="mt-1 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div className="ml-3 flex-1">
                        <span className="font-medium text-gray-900">Course urgente</span>
                        <p className="text-sm text-gray-600">+20% sur le tarif</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-xl font-semibold hover:bg-gray-200 transition"
                  >
                    Retour
                  </button>
                  <button
                    onClick={handleEstimate}
                    disabled={estimating || !formData.cargoDescription}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition disabled:opacity-50 shadow-lg"
                  >
                    {estimating ? 'Calcul...' : 'Obtenir une estimation'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Confirmation */}
            {currentStep === 3 && estimate && (
              <div className="space-y-6">
                {/* Estimate Details */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg p-8 text-white">
                  <h3 className="text-2xl font-bold mb-6">Estimation de prix</h3>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-blue-100">
                      <span>Prix de base</span>
                      <span className="font-semibold">{estimate.basePrice} DT</span>
                    </div>
                    <div className="flex justify-between text-blue-100">
                      <span>Distance ({estimate.distance} km)</span>
                      <span className="font-semibold">{estimate.distancePrice} DT</span>
                    </div>
                    {estimate.helpersCost > 0 && (
                      <div className="flex justify-between text-blue-100">
                        <span>Convoyeurs ({formData.numberOfHelpers})</span>
                        <span className="font-semibold">{estimate.helpersCost} DT</span>
                      </div>
                    )}
                    {estimate.urgentSurcharge > 0 && (
                      <div className="flex justify-between text-blue-100">
                        <span>Course urgente</span>
                        <span className="font-semibold">+{estimate.urgentSurcharge} DT</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-white/20 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xl">Prix total estimé</span>
                      <span className="text-4xl font-bold">{estimate.estimatedPrice} DT</span>
                    </div>
                    <p className="text-sm text-blue-100 mt-2">
                      Durée estimée: ~{estimate.duration} minutes
                    </p>
                  </div>
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-xl font-semibold hover:bg-gray-200 transition"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={handleCreateRide}
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition disabled:opacity-50 shadow-lg"
                  >
                    {loading ? 'Création...' : 'Publier la course'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200 sticky top-24">
              <h3 className="text-lg font-semibold mb-4">Résumé</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Véhicule</span>
                  <span className="font-medium">
                    {VEHICLE_TYPES.find((v) => v.value === formData.vehicleType)?.label}
                  </span>
                </div>
                {formData.numberOfTrips > 1 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Voyages</span>
                    <span className="font-medium">{formData.numberOfTrips}</span>
                  </div>
                )}
                {formData.numberOfHelpers > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Convoyeurs</span>
                    <span className="font-medium">{formData.numberOfHelpers}</span>
                  </div>
                )}
                {uploadedPhotos.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Photos</span>
                    <span className="font-medium">{uploadedPhotos.length}</span>
                  </div>
                )}
                {formData.isUrgent && (
                  <div className="flex justify-between text-orange-600">
                    <span>Urgente</span>
                    <span className="font-medium">+20%</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
