import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

// Compatibility URLs keep return parameters, anchors and navigation state.
export default function CompatibilityRedirect({ to }) {
  const location = useLocation();
  return (
    <Navigate
      to={{ pathname: to, search: location.search, hash: location.hash }}
      state={location.state}
      replace
    />
  );
}
