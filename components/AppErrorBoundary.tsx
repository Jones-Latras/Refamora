import { Component, type ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { ErrorState } from './ErrorState'
import { palette } from '../utils/theme'

type Props = {
  children: ReactNode
  resetKey?: string
}

type State = {
  error: Error | null
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = {
    error: null,
  }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null })
    }
  }

  componentDidCatch(error: Error) {
    console.error('Refamora render error:', error)
  }

  handleReset = () => {
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.safeArea}>
          <View style={styles.wrapper}>
            <Text style={styles.eyebrow}>Refamora</Text>
            <ErrorState
              title="Something went wrong"
              description="This screen ran into an unexpected issue. Try again to reload it."
              onAction={this.handleReset}
            />
          </View>
        </View>
      )
    }

    return this.props.children
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.cream,
  },
  wrapper: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  eyebrow: {
    color: palette.harvest,
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
})
