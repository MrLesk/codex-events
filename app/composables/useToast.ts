import { toast } from 'vue-sonner'

type ToastColor = 'primary' | 'neutral' | 'success' | 'warning' | 'error' | 'info'

type ToastOptions = {
  title: string
  description?: string
  color?: ToastColor
}

export function useToast() {
  function add(options: ToastOptions) {
    const payload = {
      description: options.description
    }

    switch (options.color) {
      case 'success':
        toast.success(options.title, payload)
        break
      case 'warning':
        toast.warning(options.title, payload)
        break
      case 'error':
        toast.error(options.title, payload)
        break
      case 'info':
        toast.info(options.title, payload)
        break
      default:
        toast(options.title, payload)
        break
    }
  }

  return {
    add
  }
}
