'use client';

/**
 * AddressAutocomplete Component
 *
 * Autocomplete input for address search using geocoding service
 * Features:
 * - Real-time search suggestions
 * - Proximity bias (searches near user location)
 * - Keyboard navigation
 * - Mantine UI integration
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  TextInput,
  Loader,
  Paper,
  Text,
  Stack,
  Group,
  ActionIcon,
  Box,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconMapPin, IconSearch, IconX, IconCurrentLocation } from '@tabler/icons-react';
import type { Coordinate, GeocodingResult } from '@/types/geolocation';

// ==========================================================================
// Types
// ==========================================================================

export interface AddressAutocompleteProps {
  /** Input label */
  label?: string;

  /** Input placeholder */
  placeholder?: string;

  /** Initial value */
  value?: string;

  /** Proximity bias coordinates (searches near this location) */
  proximity?: Coordinate;

  /** Callback when address is selected */
  onSelect: (result: GeocodingResult) => void;

  /** Callback when input value changes */
  onChange?: (value: string) => void;

  /** Callback when clear button is clicked */
  onClear?: () => void;

  /** Show "Use current location" button */
  showCurrentLocation?: boolean;

  /** Callback when current location is requested */
  onUseCurrentLocation?: () => void;

  /** Required field */
  required?: boolean;

  /** Error message */
  error?: string;

  /** Disabled state */
  disabled?: boolean;
}

// ==========================================================================
// Component
// ==========================================================================

export function AddressAutocomplete({
  label = 'Adresse',
  placeholder = 'Rechercher une adresse...',
  value: initialValue = '',
  proximity,
  onSelect,
  onChange,
  onClear,
  showCurrentLocation = false,
  onUseCurrentLocation,
  required = false,
  error,
  disabled = false,
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(initialValue);
  const [debouncedValue] = useDebouncedValue(inputValue, 300);
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // ==========================================================================
  // Fetch Suggestions
  // ==========================================================================

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);

    try {
      const params = new URLSearchParams({
        q: query,
        limit: '5',
      });

      if (proximity) {
        params.append('lat', proximity.lat.toString());
        params.append('lng', proximity.lng.toString());
      }

      const response = await fetch(`/api/geocode/autocomplete?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }

      const results: GeocodingResult[] = await response.json();
      setSuggestions(results);
      setIsOpen(results.length > 0);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, [proximity]);

  // ==========================================================================
  // Effects
  // ==========================================================================

  useEffect(() => {
    if (debouncedValue) {
      fetchSuggestions(debouncedValue);
    }
  }, [debouncedValue, fetchSuggestions]);

  useEffect(() => {
    setInputValue(initialValue);
  }, [initialValue]);

  // ==========================================================================
  // Handlers
  // ==========================================================================

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    onChange?.(value);
  };

  const handleSelectSuggestion = (result: GeocodingResult) => {
    setInputValue(result.label);
    setIsOpen(false);
    setSuggestions([]);
    onSelect(result);
  };

  const handleClear = () => {
    setInputValue('');
    setSuggestions([]);
    setIsOpen(false);
    onClear?.();
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;

      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        }
        break;

      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleCurrentLocation = () => {
    if ('geolocation' in navigator) {
      setIsLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          try {
            // Reverse geocode to get address
            const response = await fetch(
              `/api/geocode/reverse?lat=${latitude}&lng=${longitude}`
            );

            if (!response.ok) {
              throw new Error('Failed to reverse geocode');
            }

            const result: GeocodingResult = await response.json();
            setInputValue(result.label);
            onSelect(result);
            onUseCurrentLocation?.();
          } catch (error) {
            console.error('Error reverse geocoding:', error);
          } finally {
            setIsLoading(false);
          }
        },
        (error) => {
          console.error('Error getting current location:', error);
          setIsLoading(false);
        }
      );
    }
  };

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <Box pos="relative">
      <TextInput
        ref={inputRef}
        label={label}
        placeholder={placeholder}
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (suggestions.length > 0) {
            setIsOpen(true);
          }
        }}
        onBlur={() => {
          // Delay to allow click on suggestion
          setTimeout(() => setIsOpen(false), 200);
        }}
        required={required}
        error={error}
        disabled={disabled}
        leftSection={<IconSearch size={16} />}
        rightSection={
          <Group gap={4}>
            {isLoading && <Loader size="xs" />}
            {showCurrentLocation && !disabled && (
              <ActionIcon
                size="sm"
                variant="subtle"
                color="blue"
                onClick={handleCurrentLocation}
                title="Utiliser ma position actuelle"
              >
                <IconCurrentLocation size={16} />
              </ActionIcon>
            )}
            {inputValue && !disabled && (
              <ActionIcon
                size="sm"
                variant="subtle"
                color="gray"
                onClick={handleClear}
              >
                <IconX size={16} />
              </ActionIcon>
            )}
          </Group>
        }
        styles={{
          input: {
            paddingRight: showCurrentLocation ? '80px' : '60px',
          },
        }}
      />

      {/* Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <Paper
          ref={suggestionsRef}
          shadow="md"
          p={0}
          pos="absolute"
          top="100%"
          left={0}
          right={0}
          mt={4}
          style={{
            zIndex: 1000,
            maxHeight: '300px',
            overflowY: 'auto',
          }}
        >
          <Stack gap={0}>
            {suggestions.map((result, index) => (
              <Box
                key={result.id}
                p="sm"
                style={{
                  cursor: 'pointer',
                  backgroundColor:
                    index === selectedIndex
                      ? 'var(--mantine-color-blue-0)'
                      : 'transparent',
                  borderBottom:
                    index < suggestions.length - 1
                      ? '1px solid var(--mantine-color-gray-2)'
                      : 'none',
                }}
                onMouseEnter={() => setSelectedIndex(index)}
                onClick={() => handleSelectSuggestion(result)}
              >
                <Group gap="xs" wrap="nowrap">
                  <IconMapPin
                    size={18}
                    color="var(--mantine-color-blue-6)"
                    style={{ flexShrink: 0 }}
                  />
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Text size="sm" fw={500} truncate>
                      {result.name}
                    </Text>
                    {result.address && (
                      <Text size="xs" c="dimmed" truncate>
                        {result.address}
                      </Text>
                    )}
                  </Box>
                </Group>
              </Box>
            ))}
          </Stack>
        </Paper>
      )}

      {/* No Results */}
      {isOpen && !isLoading && inputValue.length >= 2 && suggestions.length === 0 && (
        <Paper
          shadow="md"
          p="md"
          pos="absolute"
          top="100%"
          left={0}
          right={0}
          mt={4}
          style={{ zIndex: 1000 }}
        >
          <Text size="sm" c="dimmed" ta="center">
            Aucun résultat trouvé
          </Text>
        </Paper>
      )}
    </Box>
  );
}
