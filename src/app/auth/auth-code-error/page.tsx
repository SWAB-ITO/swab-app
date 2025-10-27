import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function AuthCodeError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="rounded-md bg-red-50 p-6">
          <h2 className="text-lg font-medium text-red-800">
            Authentication Error
          </h2>
          <p className="mt-2 text-sm text-red-700">
            There was an error confirming your email. The link may have expired or already been used.
          </p>
          <div className="mt-6 flex gap-3">
            <Button asChild variant="outline">
              <Link href="/auth/login">
                Back to Login
              </Link>
            </Button>
            <Button asChild>
              <Link href="/auth/signup">
                Sign Up Again
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
