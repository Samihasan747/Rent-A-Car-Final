import { FleetCategories } from '@/components/home/fleet-categories'
import { HomeCta } from '@/components/home/home-cta'
import { HomeHero } from '@/components/home/home-hero'
import { HowItWorks } from '@/components/home/how-it-works'

export function HomePage() {
  return (
    <>
      <HomeHero />
      <FleetCategories />
      <HowItWorks />
      <HomeCta />
    </>
  )
}
