from django.urls import path
from . import views
from . import admin_views
from . import public_views

urlpatterns = [

    # Endpoints públicos (sin autenticación)
    path('public/variables/', public_views.get_active_variables, name='get_active_variables'),  # GET
    path('public/crops/', public_views.get_active_crops, name='get_active_crops'),  # GET

    # Usuarios normales
    path('register/', views.register, name='register'),
    path('login/', views.login, name='login'),
    path('profile/', views.profile, name='profile'),
    path('profile/update/', views.update_own_profile, name='update_own_profile'),

    # Recuperación de contraseña
    path('check-email/', views.check_email, name='check_email'),
    path('reset-password/', views.reset_password, name='reset_password'),

    # Admin — gestión de usuarios
    path('users/', views.list_users, name='list_users'),                # GET
    path('users/<str:user_id>/', views.update_user, name='update_user'), # PUT
    path('users/delete/<str:user_id>/', views.delete_user, name='delete_user'), # DELETE

    # Admin — gestión de variables del dashboard
    path('api/admin/variables/', admin_views.list_variables, name='list_variables'),  # GET
    path('api/admin/variables/create/', admin_views.create_variable, name='create_variable'),  # POST
    path('api/admin/variables/<str:variable_id>/', admin_views.update_variable, name='update_variable'),  # PUT
    path('api/admin/variables/<str:variable_id>/delete/', admin_views.delete_variable, name='delete_variable'),  # DELETE
    path('api/admin/variables/<str:variable_id>/toggle/', admin_views.toggle_variable, name='toggle_variable'),  # PATCH

    # Admin — gestión de cultivos
    path('api/admin/crops/', admin_views.list_crops, name='list_crops'),  # GET
    path('api/admin/crops/create/', admin_views.create_crop, name='create_crop'),  # POST
    path('api/admin/crops/<str:crop_id>/', admin_views.update_crop, name='update_crop'),  # PUT
    path('api/admin/crops/<str:crop_id>/delete/', admin_views.delete_crop, name='delete_crop'),  # DELETE
    path('api/admin/crops/<str:crop_id>/toggle/', admin_views.toggle_crop, name='toggle_crop'),  # PATCH

    # Listar Datasets
    path('climate-data/', views.get_climate_data, name='get_climate_data'),  # GET
    path('climate-data/save/', views.save_climate_data, name='save_climate_data'),  # POST
    path('climate-data/<str:record_id>/', views.delete_climate_data, name='delete_climate_data'),  # DELETE
]
