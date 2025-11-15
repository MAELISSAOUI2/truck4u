'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { rideApi } from '@/lib/api';
import {
  MapPin, Package, Calendar, Clock, Truck, ArrowRight, Upload, X, Users,
  AlertCircle, Check, ChevronRight, ArrowLeft, Zap
} from 'lucide-react';
import Link from 'next/link';

const VEHICLE_TYPES = [
  { value: 'PICKUP', label: 'Pickup', capacity: '500 kg', icon: '🚙', price: 15 },
  { value: 'VAN', label: 'Camionnette', capacity: '1 tonne', icon: '🚐', price: 25 },
  { value: 'SMALL_TRUCK', label: 'Petit Camion', capacity: '3 tonnes', icon: '🚚', price: 45 },
  { value: 'MEDIUM_TRUCK', label: 'Camion Moyen', capacity: '8 tonnes', icon: '🚛', price: 85 },
  { value: 'LARGE_TRUCK', label: 'Grand Camion', capacity: '20 tonnes', icon: '🚛', price: 150 },
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
    deliveryAddress: '',
    vehicleType: 'VAN',
    cargoDescription: '',
    cargoWeight: '',
    numberOfTrips: 1,
    numberOfHelpers: 0,
    isUrgent: false,
  });

  useEffect(() => {
    if (!token) router.push('/customer/login');
  }, [token]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setUploadedPhotos((prev) => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const calculateEstimate = () => {
    const vehicle = VEHICLE_TYPES.find((v) => v.value === formData.vehicleType);
    if (!vehicle) return null;

    const basePrice = vehicle.price;
    const distance = 15;
    const distancePrice = distance * 1.5;
    const weightFactor = formData.cargoWeight ? Math.max(1, parseInt(formData.cargoWeight) / 100) : 1;
    const tripsFactor = formData.numberOfTrips;
    const helpersCost = formData.numberOfHelpers * 15;
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
      duration: Math.round(distance * 3 + 15),
    };
  };

  const handleEstimate = () => {
    if (!formData.pickupAddress || !formData.deliveryAddress) {
      setError('Veuillez remplir les adresses');
      return;
    }
    setError('');
    setEstimating(true);
    setTimeout(() => {
      const calc = calculateEstimate();
      setEstimate(calc);
      setEstimating(false);
      setCurrentStep(3);
    }, 800);
  };

  const handleCreateRide = async () => {
    if (!estimate) return;
    setError('');
    setLoading(true);

    try {
      const response = await rideApi.create({
        ...formData,
        estimatedPrice: estimate.estimatedPrice,
        estimatedDistance: estimate.distance,
        estimatedDuration: estimate.duration,
        photos: uploadedPhotos,
      });
      router.push(`/customer/rides/${response.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/customer/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition">
              <ArrowLeft className="w-5 h-5" />
              <span>Retour</span>
            </Link>
            <h1 className="text-2xl font-bold">Nouvelle Course</h1>
            <div className="w-20" />
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-center gap-4">
          {[
            { num: 1, label: 'Adresses' },
            { num: 2, label: 'Détails' },
            { num: 3, label: 'Confirmation' },
          ].map((step, i) => (
            <div key={step.num} className="flex items-center gap-4">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
                currentStep >= step.num ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
              }`}>
                {currentStep > step.num ? <Check className="w-5 h-5" /> : step.num}
              </div>
              {i < 2 && (
                <div className={`w-12 h-0.5 ${currentStep > step.num ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-error/10 border border-error/30 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
            <p className="text-error text-sm">{error}</p>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1 */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="card p-8">
                  <h3 className="text-lg font-bold mb-4">Point de départ</h3>
                  <input
                    type="text"
                    value={formData.pickupAddress}
                    onChange={(e) => setFormData({ ...formData, pickupAddress: e.target.value })}
                    className="input"
                    placeholder="Ex: Avenue Habib Bourguiba, Tunis"
                  />
                </div>

                <div className="card p-8">
                  <h3 className="text-lg font-bold mb-4">Point d'arrivée</h3>
                  <input
                    type="text"
                    value={formData.deliveryAddress}
                    onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                    className="input"
                    placeholder="Ex: Zone Industrielle, Sousse"
                  />
                </div>

                <button
                  onClick={() => setCurrentStep(2)}
                  disabled={!formData.pickupAddress || !formData.deliveryAddress}
                  className="btn-primary w-full justify-center py-3 gap-2 disabled:opacity-50"
                >
                  Continuer
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Step 2 */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="card p-8">
                  <h3 className="text-lg font-bold mb-4">Type de véhicule</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {VEHICLE_TYPES.map((v) => (
                      <button
                        key={v.value}
                        onClick={() => setFormData({ ...formData, vehicleType: v.value })}
                        className={`p-4 rounded-lg border-2 text-left transition ${
                          formData.vehicleType === v.value
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="text-2xl mb-2">{v.icon}</div>
                        <p className="font-bold">{v.label}</p>
                        <p className="text-xs text-muted-foreground">{v.capacity}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="card p-8">
                  <h3 className="text-lg font-bold mb-4">Description de la marchandise</h3>
                  <textarea
                    value={formData.cargoDescription}
                    onChange={(e) => setFormData({ ...formData, cargoDescription: e.target.value })}
                    rows={3}
                    className="input"
                    placeholder="Ex: 20 cartons de produits alimentaires"
                  />
                </div>

                <div className="card p-8">
                  <h3 className="text-lg font-bold mb-4">Options</h3>
                  <label className="flex items-center gap-3 p-3 border-2 border-border rounded-lg hover:border-primary/50 cursor-pointer transition">
                    <input
                      type="checkbox"
                      checked={formData.isUrgent}
                      onChange={(e) => setFormData({ ...formData, isUrgent: e.target.checked })}
                      className="w-5 h-5 rounded"
                    />
                    <div>
                      <p className="font-semibold">Course urgente</p>
                      <p className="text-xs text-muted-foreground">+20% sur le tarif</p>
                    </div>
                  </label>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="flex-1 px-6 py-3 border-2 border-border rounded-lg font-semibold hover:bg-muted transition"
                  >
                    Retour
                  </button>
                  <button
                    onClick={handleEstimate}
                    disabled={estimating}
                    className="flex-1 btn-primary justify-center disabled:opacity-50"
                  >
                    {estimating ? 'Calcul...' : 'Obtenir une estimation'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3 */}
            {currentStep === 3 && estimate && (
              <div className="space-y-6">
                <div className="card p-8 bg-gradient-to-br from-primary to-secondary text-white">
                  <h3 className="text-2xl font-bold mb-6">Estimation de prix</h3>

                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-white/80">
                      <span>Prix de base</span>
                      <span className="font-semibold">{estimate.basePrice} DT</span>
                    </div>
                    <div className="flex justify-between text-white/80">
                      <span>Distance ({estimate.distance} km)</span>
                      <span className="font-semibold">{estimate.distancePrice} DT</span>
                    </div>
                    {estimate.helpersCost > 0 && (
                      <div className="flex justify-between text-white/80">
                        <span>Convoyeurs ({formData.numberOfHelpers})</span>
                        <span className="font-semibold">{estimate.helpersCost} DT</span>
                      </div>
                    )}
                    {estimate.urgentSurcharge > 0 && (
                      <div className="flex justify-between text-white/80">
                        <span>Course urgente</span>
                        <span className="font-semibold">+{estimate.urgentSurcharge} DT</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-white/20 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xl">Total estimé</span>
                      <span className="text-4xl font-bold">{estimate.estimatedPrice} DT</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="flex-1 px-6 py-3 border-2 border-border rounded-lg font-semibold hover:bg-muted transition"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={handleCreateRide}
                    disabled={loading}
                    className="flex-1 btn-secondary justify-center py-3 disabled:opacity-50"
                  >
                    {loading ? 'Création...' : 'Publier la course'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="card p-6 sticky top-24">
              <h3 className="text-lg font-bold mb-4">Résumé</h3>
              <div className="space-y-3 text-sm">
                {formData.pickupAddress && (
                  <div>
                    <p className="text-muted-foreground">De</p>
                    <p className="font-semibold">{formData.pickupAddress}</p>
                  </div>
                )}
                {formData.deliveryAddress && (
                  <div>
                    <p className="text-muted-foreground">À</p>
                    <p className="font-semibold">{formData.deliveryAddress}</p>
                  </div>
                )}
                {formData.vehicleType && (
                  <div>
                    <p className="text-muted-foreground">Véhicule</p>
                    <p className="font-semibold">{VEHICLE_TYPES.find(v => v.value === formData.vehicleType)?.label}</p>
                  </div>
                )}
                {estimate && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <p className="text-muted-foreground mb-2">Estimation</p>
                    <p className="text-3xl font-bold text-primary">{estimate.estimatedPrice} DT</p>
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
