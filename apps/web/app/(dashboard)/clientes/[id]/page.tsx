"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import styled, { keyframes } from "styled-components";
import { useCustomerProfile } from "@/hooks/useCustomers";
import { CustomerProfilePage } from "@/components/customers";

const shimmer = keyframes`
  0% { background-position: -400px 0; }
  100% { background-position: 400px 0; }
`;

const Skeleton = styled.div<{ $h?: string }>`
  height: ${({ $h }) => $h ?? "6rem"};
  border-radius: 12px;
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.colors.neutral[100]} 25%,
    ${({ theme }) => theme.colors.neutral[200]} 50%,
    ${({ theme }) => theme.colors.neutral[100]} 75%
  );
  background-size: 800px 100%;
  animation: ${shimmer} 1.4s infinite linear;
`;

const SkeletonLayout = styled.div`
  padding: 0 1.5rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const SkeletonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
`;

export default function CustomerProfileRoute() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const { data: profile, isLoading, isError } = useCustomerProfile(id);

  useEffect(() => {
    if (isError) {
      router.replace("/clientes");
    }
  }, [isError, router]);

  if (isLoading) {
    return (
      <SkeletonLayout>
        <Skeleton $h="2rem" style={{ maxWidth: "200px" }} />
        <Skeleton $h="5rem" />
        <SkeletonGrid>
          <Skeleton />
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </SkeletonGrid>
        <Skeleton $h="8rem" />
        <Skeleton $h="12rem" />
      </SkeletonLayout>
    );
  }

  if (!profile) return null;

  return <CustomerProfilePage profile={profile} />;
}
