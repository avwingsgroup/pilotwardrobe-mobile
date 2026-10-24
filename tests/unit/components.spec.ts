import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AmountInput from '@/components/AmountInput.vue'
import ChipGroup from '@/components/ChipGroup.vue'
import RadioCard from '@/components/RadioCard.vue'
import StatusBadge from '@/components/StatusBadge.vue'

const ionStubs = { IonIcon: true }

describe('AmountInput', () => {
  it('emits integer minor units from typed major units', async () => {
    const wrapper = mount(AmountInput, { props: { modelValue: null, currency: 'USD', label: 'Price' } })
    const input = wrapper.get('input')
    await input.setValue('780.5')
    expect(wrapper.emitted('update:modelValue')!.at(-1)).toEqual([78050])
  })

  it('strips non-numeric characters and extra decimals', async () => {
    const wrapper = mount(AmountInput, { props: { modelValue: null, currency: 'USD', label: 'Price' } })
    await wrapper.get('input').setValue('1a2.345')
    expect(wrapper.emitted('update:modelValue')!.at(-1)).toEqual([1234])
  })

  it('shows validation errors accessibly', () => {
    const wrapper = mount(AmountInput, { props: { modelValue: 100, currency: 'USD', label: 'Offer', error: 'Too low' } })
    expect(wrapper.get('[role="alert"]').text()).toBe('Too low')
    expect(wrapper.get('input').attributes('aria-invalid')).toBe('true')
  })
})

describe('StatusBadge', () => {
  it('always renders the status as text (not colour alone)', () => {
    const wrapper = mount(StatusBadge, { props: { label: 'Landed', tone: 'success' }, global: { stubs: ionStubs } })
    expect(wrapper.text()).toBe('Landed')
    expect(wrapper.classes()).toContain('badge--success')
  })
})

describe('ChipGroup', () => {
  it('toggles values in multi-select mode', async () => {
    const wrapper = mount(ChipGroup, {
      props: { label: 'Condition', multiple: true, modelValue: ['new'], options: [{ value: 'new', label: 'New' }, { value: 'good', label: 'Good' }] },
    })
    await wrapper.findAll('button')[1]!.trigger('click')
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([['new', 'good']])
    expect(wrapper.findAll('button')[0]!.attributes('aria-pressed')).toBe('true')
  })
})

describe('RadioCard', () => {
  it('exposes radio semantics and emits select', async () => {
    const wrapper = mount(RadioCard, { props: { selected: false, title: 'Standard cargo' } })
    expect(wrapper.attributes('role')).toBe('radio')
    expect(wrapper.attributes('aria-checked')).toBe('false')
    await wrapper.trigger('click')
    expect(wrapper.emitted('select')).toHaveLength(1)
  })
})
