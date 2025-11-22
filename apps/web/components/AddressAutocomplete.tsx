'use client';

import { useState, useEffect, useRef } from 'react';
import { TextInput, Loader, Paper, Stack, Text, Group } from '@mantine/core';
import { IconMapPin, IconCurrentLocation } from '@tabler/icons-react';
import { useDebouncedValue } from '@mantine/hooks';

interface AddressResult {
  display_name: string;
  lat: string;
  lon: string;
  address: {
    road?: string;
    suburb?: string;
    city?: string;
    country?: string;
  };
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string, lat: number, lng: number) => void;
  label: string;
  placeholder?: string;
  icon?: React.ReactNode;
  error?: string;
}

export default function AddressAutocomplete({
  value,
  onChange,
  label,
  placeholder,
  icon,
  error
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<AddressResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [debouncedValue] = useDebouncedValue(inputValue, 500);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Handle clicks outside to close suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch suggestions when debounced value changes
  useEffect(() => {
    if (!debouncedValue || debouncedValue.length < 3) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        // Use Nominatim (OpenStreetMap) for geocoding - completely free!
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?` +
          `q=${encodeURIComponent(debouncedValue)}&` +
          `format=json&` +
          `addressdetails=1&` +
          `limit=5&` +
          `countrycodes=tn&` + // Tunisia
          `accept-language=fr`
        );

        if (response.ok) {
          const data = await response.json();
          setSuggestions(data);
          setShowSuggestions(true);
        }
      } catch (error) {
        console.error('Error fetching address suggestions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [debouncedValue]);

  const handleSelectSuggestion = (suggestion: AddressResult) => {
    const displayAddress = suggestion.display_name;
    setInputValue(displayAddress);
    onChange(displayAddress, parseFloat(suggestion.lat), parseFloat(suggestion.lon));
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('La géolocalisation n\'est pas supportée par votre navigateur');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // Reverse geocoding to get address from coordinates
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?` +
            `lat=${latitude}&` +
            `lon=${longitude}&` +
            `format=json&` +
            `accept-language=fr`
          );

          if (response.ok) {
            const data = await response.json();
            const address = data.display_name;
            setInputValue(address);
            onChange(address, latitude, longitude);
          }
        } catch (error) {
          console.error('Error reverse geocoding:', error);
          // Even if reverse geocoding fails, use the coordinates
          setInputValue(`Position: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          onChange(`Position: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`, latitude, longitude);
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Impossible d\'obtenir votre position');
        setLoading(false);
      }
    );
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <TextInput
        label={label}
        placeholder={placeholder || 'Commencez à taper l\'adresse...'}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onFocus={() => {
          if (suggestions.length > 0) setShowSuggestions(true);
        }}
        leftSection={icon || <IconMapPin size={16} />}
        rightSection={
          loading ? (
            <Loader size="xs" />
          ) : (
            <IconCurrentLocation
              size={20}
              style={{ cursor: 'pointer' }}
              onClick={handleGetCurrentLocation}
              title="Utiliser ma position actuelle"
            />
          )
        }
        error={error}
        styles={{
          input: {
            borderBottomLeftRadius: showSuggestions && suggestions.length > 0 ? 0 : undefined,
            borderBottomRightRadius: showSuggestions && suggestions.length > 0 ? 0 : undefined,
          }
        }}
      />

      {showSuggestions && suggestions.length > 0 && (
        <Paper
          shadow="md"
          p={0}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1000,
            maxHeight: '300px',
            overflowY: 'auto',
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
          }}
          withBorder
        >
          <Stack gap={0}>
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                onClick={() => handleSelectSuggestion(suggestion)}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  borderBottom: index < suggestions.length - 1 ? '1px solid #e9ecef' : 'none',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Group gap="xs">
                  <IconMapPin size={16} style={{ color: '#868e96' }} />
                  <div style={{ flex: 1 }}>
                    <Text size="sm" fw={500}>
                      {suggestion.address.road || suggestion.display_name.split(',')[0]}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {suggestion.display_name}
                    </Text>
                  </div>
                </Group>
              </div>
            ))}
          </Stack>
        </Paper>
      )}
    </div>
  );
}
