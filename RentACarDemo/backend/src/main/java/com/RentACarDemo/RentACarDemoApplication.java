package com.RentACarDemo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class RentACarDemoApplication {

	public static void main(String[] args) {
		SpringApplication.run(RentACarDemoApplication.class, args);

		System.out.println("Ready");
	}
}

