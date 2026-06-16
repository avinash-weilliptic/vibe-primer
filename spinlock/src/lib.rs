//! A simple spinlock-based mutex.
//!
//! This is an educational implementation that mirrors the shape of
//! [`std::sync::Mutex`]: lock the data to get a guard, deref the guard to
//! reach the data, and the lock is released automatically when the guard is
//! dropped. Unlike the std mutex, a thread that fails to acquire the lock
//! *spins* (busy-waits) instead of sleeping, so this is only appropriate for
//! very short critical sections.

use std::cell::UnsafeCell;
use std::ops::{Deref, DerefMut};
use std::sync::atomic::{AtomicBool, Ordering};

/// A mutual-exclusion primitive that protects a single value of type `T`.
pub struct Mutex<T> {
    /// `false` = unlocked, `true` = locked.
    locked: AtomicBool,
    /// The protected data. `UnsafeCell` is what lets us hand out `&mut T`
    /// from behind a shared `&Mutex<T>` reference.
    data: UnsafeCell<T>,
}

// SAFETY: the lock guarantees that only one thread can access `data` at a
// time, so it is safe to share a `&Mutex<T>` across threads as long as `T`
// itself is `Send`.
unsafe impl<T: Send> Sync for Mutex<T> {}
unsafe impl<T: Send> Send for Mutex<T> {}

impl<T> Mutex<T> {
    /// Creates a new unlocked mutex wrapping `value`.
    pub const fn new(value: T) -> Self {
        Mutex {
            locked: AtomicBool::new(false),
            data: UnsafeCell::new(value),
        }
    }

    /// Acquires the lock, spinning until it becomes available, and returns a
    /// guard granting access to the protected data.
    pub fn lock(&self) -> MutexGuard<'_, T> {
        // Try to flip `locked` from false -> true. While it's already true,
        // keep spinning. `Acquire` ordering ensures we see writes made by the
        // previous lock holder before it released.
        while self
            .locked
            .compare_exchange_weak(false, true, Ordering::Acquire, Ordering::Relaxed)
            .is_err()
        {
            // Hint to the CPU that we're in a busy-wait loop.
            std::hint::spin_loop();
        }
        MutexGuard { mutex: self }
    }

    /// Attempts to acquire the lock without spinning. Returns `None` if it is
    /// already held.
    pub fn try_lock(&self) -> Option<MutexGuard<'_, T>> {
        self.locked
            .compare_exchange(false, true, Ordering::Acquire, Ordering::Relaxed)
            .ok()
            .map(|_| MutexGuard { mutex: self })
    }
}

/// An RAII guard. Holding it means holding the lock; dropping it releases.
pub struct MutexGuard<'a, T> {
    mutex: &'a Mutex<T>,
}

impl<T> Deref for MutexGuard<'_, T> {
    type Target = T;

    fn deref(&self) -> &T {
        // SAFETY: holding the guard proves we hold the lock, so we have
        // exclusive access to the data.
        unsafe { &*self.mutex.data.get() }
    }
}

impl<T> DerefMut for MutexGuard<'_, T> {
    fn deref_mut(&mut self) -> &mut T {
        // SAFETY: same as `deref`; `&mut self` proves no other guard exists.
        unsafe { &mut *self.mutex.data.get() }
    }
}

impl<T> Drop for MutexGuard<'_, T> {
    fn drop(&mut self) {
        // `Release` ordering publishes our writes to the next thread that
        // acquires the lock.
        self.mutex.locked.store(false, Ordering::Release);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;
    use std::thread;

    #[test]
    fn single_thread_read_write() {
        let m = Mutex::new(5);
        {
            let mut g = m.lock();
            *g += 10;
        }
        assert_eq!(*m.lock(), 15);
    }

    #[test]
    fn try_lock_fails_while_held() {
        let m = Mutex::new(());
        let _g = m.lock();
        assert!(m.try_lock().is_none());
    }

    #[test]
    fn contended_counter_is_consistent() {
        let counter = Arc::new(Mutex::new(0u64));
        let mut handles = Vec::new();

        for _ in 0..8 {
            let counter = Arc::clone(&counter);
            handles.push(thread::spawn(move || {
                for _ in 0..10_000 {
                    *counter.lock() += 1;
                }
            }));
        }

        for h in handles {
            h.join().unwrap();
        }

        assert_eq!(*counter.lock(), 8 * 10_000);
    }
}
