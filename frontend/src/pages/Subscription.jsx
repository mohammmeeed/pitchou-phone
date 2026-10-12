import React, { useState } from 'react';
import Header from '../components/Header';

const plans = [
  {
    id: 'plus',
    title: 'W3Dating App',
    badge: 'PLUS',
    price: '$9.99/mo',
    features: [
      { name: 'Unlimited Likes', included: true },
      { name: 'See Who Likes You', included: false },
      { name: 'Priority Likes', included: false },
      { name: 'Unlimited Rewinds', included: true },
      { name: '1 Free Boost per month', included: false },
      { name: '5 Free Super Likes per week', included: false },
      { name: 'Message Before Matching', included: false },
      { name: 'Passport', included: true },
      { name: 'Control Your Profile', included: true },
    ]
  },
  {
    id: 'gold',
    title: 'W3Dating App',
    badge: 'GOLD',
    price: '$19.99/mo',
    features: [
      { name: 'Unlimited Likes', included: true },
      { name: 'See Who Likes You', included: true },
      { name: 'Priority Likes', included: false },
      { name: 'Unlimited Rewinds', included: true },
      { name: '1 Free Boost per month', included: true },
      { name: '5 Free Super Likes per week', included: true },
      { name: 'Message Before Matching', included: false },
      { name: 'Passport', included: true },
      { name: 'Control Your Profile', included: true },
    ]
  },
  {
    id: 'platinum',
    title: 'W3Dating App',
    badge: 'PLATINUM',
    price: '$29.99/mo',
    features: [
      { name: 'Unlimited Likes', included: true },
      { name: 'See Who Likes You', included: true },
      { name: 'Priority Likes', included: true },
      { name: 'Unlimited Rewinds', included: true },
      { name: '1 Free Boost per month', included: true },
      { name: '5 Free Super Likes per week', included: true },
      { name: 'Message Before Matching', included: true },
      { name: 'Passport', included: true },
      { name: 'Control Your Profile', included: true },
    ]
  }
];

const Subscription = () => {
  const [selectedPlan, setSelectedPlan] = useState('gold');

  const activePlan = plans.find(p => p.id === selectedPlan) || plans[0];

  return (
    <div className="page-wrapper">
      <Header title="My Subscription" showBack={true} backUrl="/profile" bgWhite={true} />

      <div className="page-content space-top p-b60">
        <div className="container">
          <div className="dz-subscribe-area">
            {/* Plan Selector tabs */}
            <div className="subscribe-area-top mb-3">
              <div className="d-flex gap-2 justify-content-center">
                {plans.map((plan) => (
                  <div 
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`subscribe-box ${plan.id} p-3 rounded-xl text-center cursor-pointer flex-1 ${selectedPlan === plan.id ? 'border-primary shadow' : ''}`}
                    style={{ cursor: 'pointer', border: selectedPlan === plan.id ? '2px solid #FF50A2' : '1px solid #eee' }}
                  >
                    <h5 className="title mb-1 font-14 font-w600">{plan.badge}</h5>
                    <span className="font-12 text-primary font-w700">{plan.price}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Plan Features */}
            <div className={`subscribe-content ${selectedPlan}`}>
              <ul className="pricing-data list-unstyled">
                {activePlan.features.map((feat, idx) => (
                  <li key={idx} className={feat.included ? 'list-true' : 'list-false'}>
                    <i className={`icon feather ${feat.included ? 'icon-check text-success' : 'icon-lock text-muted'}`}></i>
                    <span>{feat.name}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bottom-btn mt-4">
              <button 
                type="button" 
                onClick={() => alert(`Subscribed to ${activePlan.badge} plan successfully!`)}
                className="btn btn-lg btn-gradient w-100 dz-flex-box rounded-xl"
              >
                Get {activePlan.badge} ({activePlan.price})
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Subscription;
