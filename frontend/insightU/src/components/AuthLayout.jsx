import { motion } from "framer-motion"

export function AuthLayout({ title, description, children, footer }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="mt-1.5 text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {children}
        {footer && <div className="mt-6 text-center text-sm">{footer}</div>}
      </motion.div>
    </div>
  )
}