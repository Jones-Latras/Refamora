import { Pressable, ScrollView, StyleSheet, Text } from 'react-native'

import { palette } from '../utils/theme'

type WasteSuggestionsProps = {
  suggestions: string[]
  onSelect: (value: string) => void
}

export function WasteSuggestions({
  suggestions,
  onSelect,
}: WasteSuggestionsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {suggestions.map((suggestion) => (
        <Pressable
          key={suggestion}
          onPress={() => onSelect(suggestion)}
          style={styles.chip}
        >
          <Text style={styles.chipText}>{suggestion}</Text>
        </Pressable>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: {
    gap: 10,
  },
  chip: {
    backgroundColor: '#efe1c3',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipText: {
    color: palette.clay,
    fontWeight: '600',
    fontSize: 13,
  },
})
