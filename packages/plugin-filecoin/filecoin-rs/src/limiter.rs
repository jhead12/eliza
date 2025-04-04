// src/limiter.rs
pub struct NoopLimiter {
    limit: usize,
}

impl NoopLimiter {
    pub fn new(limit: usize) -> Self {
        Self { limit }
    }
}